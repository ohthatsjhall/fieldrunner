import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizationMemberships } from './organization-memberships';
import { organizationInvitations } from './organization-invitations';
import { organizationDomains } from './organization-domains';

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').unique().notNull(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  imageUrl: text('image_url'),
  hasImage: boolean('has_image').default(false),
  createdBy: text('created_by'),
  maxAllowedMemberships: integer('max_allowed_memberships'),
  membersCount: integer('members_count').default(0),
  pendingInvitationsCount: integer('pending_invitations_count').default(0),
  adminDeleteEnabled: boolean('admin_delete_enabled').default(true),
  publicMetadata: jsonb('public_metadata').$type<Record<string, unknown>>(),
  privateMetadata: jsonb('private_metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export const organizationsRelations = relations(
  organizations,
  ({ many }) => ({
    memberships: many(organizationMemberships),
    invitations: many(organizationInvitations),
    domains: many(organizationDomains),
  }),
);
