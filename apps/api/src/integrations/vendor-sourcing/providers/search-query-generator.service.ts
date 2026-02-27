import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { ServiceRequestDetail } from '@fieldrunner/shared';

export type GeneratedSearchQueries = {
  queries: string[];
  category: string;
  reasoning: string;
};

const SYSTEM_PROMPT = `You are a search query optimizer for a facilities management platform. Given a service request, generate 2-3 highly specific Google Places search queries to find the right local contractor.

Rules:
- Queries should be what you'd type into Google Maps to find the right vendor
- Be specific to the actual work needed, not generic categories
- Include trade-specific terms a real contractor would use
- Return 2-3 queries ordered from most specific to broadest
- Also return the best-fit trade category for organizing this vendor

Respond with ONLY valid JSON in this exact format:
{
  "queries": ["most specific query", "broader query"],
  "category": "Trade Category Name",
  "reasoning": "Brief explanation of why these queries will find the right contractor"
}`;

@Injectable()
export class SearchQueryGeneratorService {
  private readonly logger = new Logger(SearchQueryGeneratorService.name);
  private readonly client: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async generateSearchQueries(
    sr: ServiceRequestDetail,
  ): Promise<GeneratedSearchQueries> {
    const userPrompt = this.buildPrompt(sr);

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const text =
        response.content[0].type === 'text' ? response.content[0].text : '';

      return this.parseResponse(text, sr);
    } catch (error) {
      this.logger.error('Claude query generation failed', error);
      return this.buildFallback(sr);
    }
  }

  private buildPrompt(sr: ServiceRequestDetail): string {
    const parts: string[] = [
      `Service Request #${sr.serviceRequestId}`,
      `Description: ${sr.description}`,
    ];

    if (sr.detailedDescription) {
      parts.push(`Detailed Description: ${sr.detailedDescription}`);
    }

    parts.push(`Type: ${sr.type}`);
    parts.push(`Priority: ${sr.priority}`);

    const category = sr.customFields.find((f) => f.name === 'Category');
    if (category?.value) {
      parts.push(`Category: ${category.value}`);
    }

    if (sr.equipment.length > 0) {
      const equipNames = sr.equipment
        .map((e) => [e.equipName, e.equipType, e.mfrName].filter(Boolean).join(' '))
        .join(', ');
      parts.push(`Equipment: ${equipNames}`);
    }

    parts.push(`Customer: ${sr.customerName}`);
    parts.push(
      `Location: ${sr.customerLocationCity}, ${sr.customerLocationState}`,
    );

    return parts.join('\n');
  }

  private parseResponse(
    text: string,
    sr: ServiceRequestDetail,
  ): GeneratedSearchQueries {
    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (
        !Array.isArray(parsed.queries) ||
        parsed.queries.length === 0 ||
        !parsed.queries.every((q: unknown) => typeof q === 'string')
      ) {
        this.logger.warn('Invalid queries in Claude response, using fallback');
        return this.buildFallback(sr);
      }

      return {
        queries: parsed.queries.slice(0, 3),
        category: parsed.category ?? 'General',
        reasoning: parsed.reasoning ?? '',
      };
    } catch {
      this.logger.warn('Failed to parse Claude response, using fallback');
      return this.buildFallback(sr);
    }
  }

  private buildFallback(sr: ServiceRequestDetail): GeneratedSearchQueries {
    const category = sr.customFields.find((f) => f.name === 'Category');
    const hint = category?.value || sr.type || '';
    const desc = sr.description || '';

    const query = [hint, desc, 'contractor'].filter(Boolean).join(' ').trim();

    return {
      queries: [query],
      category: hint || 'General',
      reasoning: 'Fallback: Claude API unavailable',
    };
  }
}
