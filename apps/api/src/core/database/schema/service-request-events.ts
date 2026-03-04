import {
  bigint,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { serviceRequests } from './service-requests';

export const serviceRequestEvents = pgTable(
  'service_request_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id)
      .notNull(),
    serviceRequestId: uuid('service_request_id')
      .references(() => serviceRequests.id)
      .notNull(),
    fromStatus: text('from_status'),
    toStatus: text('to_status').notNull(),
    occurredAt: timestamp('occurred_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    durationInStatusMs: bigint('duration_in_status_ms', { mode: 'number' }),
    source: text('source'),
    bluefolderHistoryId: integer('bluefolder_history_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique('uq_sr_event_bf_history').on(
      t.serviceRequestId,
      t.bluefolderHistoryId,
    ),
  ],
);

export const serviceRequestEventsRelations = relations(
  serviceRequestEvents,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [serviceRequestEvents.organizationId],
      references: [organizations.id],
    }),
    serviceRequest: one(serviceRequests, {
      fields: [serviceRequestEvents.serviceRequestId],
      references: [serviceRequests.id],
    }),
  }),
);
