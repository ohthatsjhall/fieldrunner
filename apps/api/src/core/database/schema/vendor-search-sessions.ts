import {
  decimal,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { serviceRequests } from './service-requests';
import { tradeCategories } from './trade-categories';

export const vendorSearchSessions = pgTable('vendor_search_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  serviceRequestId: uuid('service_request_id').references(
    () => serviceRequests.id,
  ),
  tradeCategoryId: uuid('trade_category_id').references(
    () => tradeCategories.id,
  ),
  searchQuery: text('search_query').notNull(),
  searchAddress: text('search_address').notNull(),
  searchLatitude: decimal('search_latitude', { precision: 10, scale: 7 }),
  searchLongitude: decimal('search_longitude', { precision: 10, scale: 7 }),
  searchRadiusMeters: integer('search_radius_meters').default(40000).notNull(),
  status: text('status').default('pending').notNull(),
  resultCount: integer('result_count').default(0).notNull(),
  sources: jsonb('sources').$type<Record<string, number>>(),
  errorMessage: text('error_message'),
  durationMs: integer('duration_ms'),
  initiatedBy: text('initiated_by'),
  completedAt: timestamp('completed_at', {
    withTimezone: true,
    mode: 'date',
  }),
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
});

export const vendorSearchSessionsRelations = relations(
  vendorSearchSessions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [vendorSearchSessions.organizationId],
      references: [organizations.id],
    }),
    serviceRequest: one(serviceRequests, {
      fields: [vendorSearchSessions.serviceRequestId],
      references: [serviceRequests.id],
    }),
    tradeCategory: one(tradeCategories, {
      fields: [vendorSearchSessions.tradeCategoryId],
      references: [tradeCategories.id],
    }),
  }),
);
