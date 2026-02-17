import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

export const organizationDomains = pgTable('organization_domains', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').unique().notNull(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  name: text('name').notNull(),
  enrollmentMode: text('enrollment_mode'),
  affiliationEmailAddress: text('affiliation_email_address'),
  verification: jsonb('verification').$type<Record<string, unknown> | null>(),
  totalPendingInvitations: integer('total_pending_invitations').default(0),
  totalPendingSuggestions: integer('total_pending_suggestions').default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export const organizationDomainsRelations = relations(
  organizationDomains,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationDomains.organizationId],
      references: [organizations.id],
    }),
  }),
);
