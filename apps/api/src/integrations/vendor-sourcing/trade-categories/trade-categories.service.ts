import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../core/database/database.module';
import { tradeCategories } from '../../../core/database/schema';
import { DEFAULT_TRADE_CATEGORIES } from './default-categories';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '../../../core/database/schema';

export type ResolvedCategory = {
  categoryId: string | null;
  queries: string[];
  matchLevel: 'exact' | 'related' | 'fuzzy';
};

@Injectable()
export class TradeCategoriesService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async seedDefaults(organizationId: string): Promise<void> {
    const values = DEFAULT_TRADE_CATEGORIES.map((cat) => ({
      organizationId,
      name: cat.name,
      searchQueries: cat.searchQueries,
      googlePlacesType: cat.googlePlacesType,
      isDefault: true,
    }));

    await this.db
      .insert(tradeCategories)
      .values(values)
      .onConflictDoNothing();
  }

  async findAll(organizationId: string) {
    return this.db
      .select()
      .from(tradeCategories)
      .where(eq(tradeCategories.organizationId, organizationId));
  }

  async resolveSearchQueries(
    organizationId: string,
    categoryName: string,
  ): Promise<ResolvedCategory> {
    const allCategories = await this.findAll(organizationId);

    // 1. Exact match (case-insensitive)
    const exact = allCategories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
    );
    if (exact) {
      return {
        categoryId: exact.id,
        queries: exact.searchQueries,
        matchLevel: 'exact',
      };
    }

    // 2. Partial/substring match — category name appears in input or vice versa
    const partial = allCategories.find(
      (c) =>
        categoryName.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(categoryName.toLowerCase()),
    );
    if (partial) {
      return {
        categoryId: partial.id,
        queries: partial.searchQueries,
        matchLevel: 'related',
      };
    }

    // 3. Check if input matches any search query keyword
    const normalizedInput = categoryName.toLowerCase();
    for (const cat of allCategories) {
      const hasMatch = cat.searchQueries.some(
        (q) =>
          normalizedInput.includes(q.toLowerCase()) ||
          q.toLowerCase().includes(normalizedInput),
      );
      if (hasMatch) {
        return {
          categoryId: cat.id,
          queries: cat.searchQueries,
          matchLevel: 'fuzzy',
        };
      }
    }

    // 4. Fallback to generic
    return {
      categoryId: null,
      queries: ['contractor'],
      matchLevel: 'fuzzy',
    };
  }
}
