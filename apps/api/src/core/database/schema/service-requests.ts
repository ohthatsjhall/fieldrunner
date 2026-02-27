import {
  boolean,
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

export const serviceRequests = pgTable(
  'service_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id)
      .notNull(),
    bluefolderId: integer('bluefolder_id').notNull(),
    description: text('description').default('').notNull(),
    status: text('status').default('').notNull(),
    priority: text('priority').default('').notNull(),
    priorityLabel: text('priority_label').default('').notNull(),
    type: text('type').default('').notNull(),
    customerName: text('customer_name').default('').notNull(),
    customerId: integer('customer_id'),
    isOpen: boolean('is_open').default(true).notNull(),
    isOverdue: boolean('is_overdue').default(false).notNull(),
    billableTotal: decimal('billable_total', {
      precision: 12,
      scale: 2,
    }).default('0'),
    costTotal: decimal('cost_total', { precision: 12, scale: 2 }).default('0'),
    dateTimeCreated: timestamp('date_time_created', {
      withTimezone: true,
      mode: 'date',
    }),
    dateTimeClosed: timestamp('date_time_closed', {
      withTimezone: true,
      mode: 'date',
    }),
    syncedAt: timestamp('synced_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
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
  (t) => [unique('uq_org_bluefolder').on(t.organizationId, t.bluefolderId)],
);

export const serviceRequestsRelations = relations(
  serviceRequests,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [serviceRequests.organizationId],
      references: [organizations.id],
    }),
  }),
);
