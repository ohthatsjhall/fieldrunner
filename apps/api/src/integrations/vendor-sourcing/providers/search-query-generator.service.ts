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
- Strip urgency/priority language from queries. Words like 'emergency', 'urgent', 'critical', 'immediate', 'ASAP', '24-hour', 'same-day' bias Google Places results toward expensive emergency services rather than the best-fit contractor for the actual trade work.
- CRITICAL: The customer name and location name describe the CLIENT'S business — where the work is performed. They do NOT describe the type of contractor needed. Never include the customer's business type in search queries. Google Places interprets every word literally, so including the client's industry will return businesses in that industry instead of the contractors who service them.
- Your queries must ONLY contain words describing the trade, skill, or contractor type needed to perform the work. Derive this from the description, detailed description, category, and equipment fields — not the customer name.

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
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not configured. AI-powered search query generation requires a valid Anthropic API key.',
      );
    }
    this.client = new Anthropic({ apiKey });
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
    const workParts: string[] = [
      `Description: ${sr.description}`,
    ];

    if (sr.detailedDescription) {
      workParts.push(`Detailed Description: ${sr.detailedDescription}`);
    }

    const category = sr.customFields.find((f) => f.name === 'Category');
    if (category?.value) {
      workParts.push(`Category: ${category.value}`);
    }

    workParts.push(`Type: ${sr.type}`);
    workParts.push(`Priority: ${sr.priority}`);

    if (sr.equipment.length > 0) {
      const equipNames = sr.equipment
        .map((e) =>
          [e.equipName, e.equipType, e.mfrName].filter(Boolean).join(' '),
        )
        .join(', ');
      workParts.push(`Equipment: ${equipNames}`);
    }

    const contextParts: string[] = [
      `Customer: ${sr.customerName}`,
      `Location: ${sr.customerLocationCity}, ${sr.customerLocationState}`,
    ];

    return [
      `Service Request #${sr.serviceRequestId}`,
      '',
      '=== WORK NEEDED (use this to determine the contractor type) ===',
      ...workParts,
      '',
      '=== CLIENT CONTEXT (do NOT include in search queries) ===',
      ...contextParts,
    ].join('\n');
  }

  private parseResponse(
    text: string,
    sr: ServiceRequestDetail,
  ): GeneratedSearchQueries {
    try {
      // Strip markdown code fences if present
      const cleaned = text
        .replace(/```json?\n?/g, '')
        .replace(/```/g, '')
        .trim();
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
