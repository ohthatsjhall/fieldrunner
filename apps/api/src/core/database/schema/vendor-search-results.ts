import {
  decimal,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { vendorSearchSessions } from './vendor-search-sessions';
import { vendors } from './vendors';
import { vendorContactAttempts } from './vendor-contact-attempts';

export const vendorSearchResults = pgTable(
  'vendor_search_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    searchSessionId: uuid('search_session_id')
      .references(() => vendorSearchSessions.id)
      .notNull(),
    vendorId: uuid('vendor_id')
      .references(() => vendors.id)
      .notNull(),
    rank: integer('rank').notNull(),
    score: decimal('score', { precision: 5, scale: 2 }).notNull(),
    distanceScore: decimal('distance_score', { precision: 5, scale: 2 }),
    ratingScore: decimal('rating_score', { precision: 5, scale: 2 }),
    reviewCountScore: decimal('review_count_score', { precision: 5, scale: 2 }),
    categoryMatchScore: decimal('category_match_score', {
      precision: 5,
      scale: 2,
    }),
    businessHoursScore: decimal('business_hours_score', {
      precision: 5,
      scale: 2,
    }),
    credentialScore: decimal('credential_score', { precision: 5, scale: 2 }),
    distanceMeters: decimal('distance_meters', { precision: 10, scale: 2 }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique('uq_session_vendor').on(t.searchSessionId, t.vendorId),
    unique('uq_session_rank').on(t.searchSessionId, t.rank),
  ],
);

export const vendorSearchResultsRelations = relations(
  vendorSearchResults,
  ({ one, many }) => ({
    searchSession: one(vendorSearchSessions, {
      fields: [vendorSearchResults.searchSessionId],
      references: [vendorSearchSessions.id],
    }),
    vendor: one(vendors, {
      fields: [vendorSearchResults.vendorId],
      references: [vendors.id],
    }),
    contactAttempts: many(vendorContactAttempts),
  }),
);
