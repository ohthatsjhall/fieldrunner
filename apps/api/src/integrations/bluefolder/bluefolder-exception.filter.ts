import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import type { Response } from 'express';
import {
  BlueFolderApiError,
  BlueFolderRateLimitError,
} from './bluefolder-client.service';

@Catch(BlueFolderApiError)
export class BlueFolderExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BlueFolderExceptionFilter.name);

  catch(exception: BlueFolderApiError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.warn('BlueFolder API error', {
      code: exception.code,
      message: exception.message,
      statusCode: exception.statusCode,
    });

    const body: Record<string, unknown> = {
      statusCode: exception.statusCode,
      error: 'BlueFolder API Error',
      message: exception.message,
      code: exception.code,
    };

    if (exception instanceof BlueFolderRateLimitError) {
      body.retryAfterSeconds = exception.retryAfterSeconds;
    }

    response.status(exception.statusCode).json(body);
  }
}
