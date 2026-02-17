import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkEventId: text('clerk_event_id').unique().notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  processedAt: timestamp('processed_at', {
    withTimezone: true,
    mode: 'date',
  }),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});
