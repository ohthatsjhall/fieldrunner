import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './users';

export const organizationInvitations = pgTable('organization_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').unique().notNull(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .notNull(),
  emailAddress: text('email_address').notNull(),
  role: text('role').notNull(),
  roleName: text('role_name'),
  status: text('status').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
  userId: uuid('user_id').references(() => users.id),
  publicMetadata: jsonb('public_metadata').$type<Record<string, unknown>>(),
  privateMetadata: jsonb('private_metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export const organizationInvitationsRelations = relations(
  organizationInvitations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationInvitations.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationInvitations.userId],
      references: [users.id],
    }),
  }),
);
