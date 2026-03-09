import {
  decimal,
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
import { vendors } from './vendors';
import { vendorSearchSessions } from './vendor-search-sessions';

export const vendorAssignments = pgTable(
  'vendor_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id)
      .notNull(),
    serviceRequestId: uuid('service_request_id')
      .references(() => serviceRequests.id)
      .notNull(),
    vendorId: uuid('vendor_id').references(() => vendors.id),
    searchSessionId: uuid('search_session_id').references(
      () => vendorSearchSessions.id,
    ),
    source: text('source').notNull(),
    vendorName: text('vendor_name').notNull(),
    vendorPhone: text('vendor_phone'),
    vendorPhoneRaw: text('vendor_phone_raw'),
    vendorEmail: text('vendor_email'),
    rank: integer('rank'),
    score: decimal('score', { precision: 5, scale: 2 }),
    bfRawFieldValue: text('bf_raw_field_value'),
    matchConfidence: text('match_confidence'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique('uq_org_sr_vendor_assignment').on(
      t.organizationId,
      t.serviceRequestId,
    ),
  ],
);

export const vendorAssignmentsRelations = relations(
  vendorAssignments,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [vendorAssignments.organizationId],
      references: [organizations.id],
    }),
    serviceRequest: one(serviceRequests, {
      fields: [vendorAssignments.serviceRequestId],
      references: [serviceRequests.id],
    }),
    vendor: one(vendors, {
      fields: [vendorAssignments.vendorId],
      references: [vendors.id],
    }),
    searchSession: one(vendorSearchSessions, {
      fields: [vendorAssignments.searchSessionId],
      references: [vendorSearchSessions.id],
    }),
  }),
);
