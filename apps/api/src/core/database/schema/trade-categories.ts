import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

export const tradeCategories = pgTable(
  'trade_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id)
      .notNull(),
    name: text('name').notNull(),
    searchQueries: jsonb('search_queries').$type<string[]>().notNull(),
    googlePlacesType: text('google_places_type'),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (t) => [unique('uq_org_trade_category').on(t.organizationId, t.name)],
);

export const tradeCategoriesRelations = relations(
  tradeCategories,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [tradeCategories.organizationId],
      references: [organizations.id],
    }),
  }),
);
