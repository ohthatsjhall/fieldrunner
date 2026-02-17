import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../auth/decorators';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @Public()
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ) {
    const rawBody = req.rawBody;

    if (!rawBody) {
      this.logger.warn('Webhook received without raw body');
      throw new BadRequestException('Missing request body');
    }

    const svixId = headers['svix-id'];
    const svixTimestamp = headers['svix-timestamp'];
    const svixSignature = headers['svix-signature'];

    if (!svixId || !svixTimestamp || !svixSignature) {
      this.logger.warn('Webhook received with missing svix headers', {
        hasSvixId: !!svixId,
        hasSvixTimestamp: !!svixTimestamp,
        hasSvixSignature: !!svixSignature,
      });
      throw new BadRequestException('Missing required webhook headers');
    }

    // Step 1: Verify the webhook signature
    const event = this.webhooksService.verifyWebhook(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });

    this.logger.log('Webhook signature verified', {
      eventType: event.type,
      clerkEventId: svixId,
    });

    // Step 2: Log event to DB (returns false if duplicate)
    const isNew = await this.webhooksService.logEvent(
      svixId,
      event.type,
      event.data as unknown as Record<string, unknown>,
    );

    if (!isNew) {
      this.logger.log('Duplicate webhook event skipped', {
        clerkEventId: svixId,
        eventType: event.type,
      });
      return { status: 'duplicate', clerkEventId: svixId };
    }

    // Step 3: Process event and update status
    try {
      await this.webhooksService.processEvent(event);
      await this.webhooksService.markProcessed(svixId);

      this.logger.log('Webhook event processed successfully', {
        clerkEventId: svixId,
        eventType: event.type,
      });

      return { status: 'processed', clerkEventId: svixId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.webhooksService.markFailed(svixId, errorMessage);

      // Retryable errors: throw so Svix gets a 5xx and retries
      if (this.isRetryableError(error)) {
        this.logger.error('Webhook processing failed (retryable)', {
          clerkEventId: svixId,
          eventType: event.type,
          error: errorMessage,
        });
        throw error;
      }

      // Non-retryable errors: return 200 so Svix does not retry
      this.logger.error('Webhook processing failed (non-retryable)', {
        clerkEventId: svixId,
        eventType: event.type,
        error: errorMessage,
      });

      return {
        status: 'failed',
        clerkEventId: svixId,
        error: errorMessage,
      };
    }
  }

  /**
   * Determines whether an error is retryable. DB connection errors and
   * FK constraint violations (entity not yet synced) should be retried.
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const retryablePatterns = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'connection',
      'foreign key',
      'violates foreign key constraint',
      'referenced entity not found',
    ];

    const message = error.message.toLowerCase();
    return retryablePatterns.some((pattern) =>
      message.includes(pattern.toLowerCase()),
    );
  }
}
