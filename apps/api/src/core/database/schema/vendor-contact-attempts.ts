import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { vendorSearchResults } from './vendor-search-results';

export const vendorContactAttempts = pgTable('vendor_contact_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  vendorSearchResultId: uuid('vendor_search_result_id')
    .references(() => vendorSearchResults.id)
    .notNull(),
  status: text('status').notNull(), // 'no_answer' | 'unavailable' | 'declined'
  notes: text('notes'),
  attemptedAt: timestamp('attempted_at', {
    withTimezone: true,
    mode: 'date',
  })
    .defaultNow()
    .notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  })
    .defaultNow()
    .notNull(),
});

export const vendorContactAttemptsRelations = relations(
  vendorContactAttempts,
  ({ one }) => ({
    vendorSearchResult: one(vendorSearchResults, {
      fields: [vendorContactAttempts.vendorSearchResultId],
      references: [vendorSearchResults.id],
    }),
  }),
);
