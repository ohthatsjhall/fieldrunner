import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizationMemberships } from './organization-memberships';
import { organizationInvitations } from './organization-invitations';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').unique().notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email'),
  imageUrl: text('image_url'),
  hasImage: boolean('has_image').default(false),
  username: text('username'),
  passwordEnabled: boolean('password_enabled').default(false),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  banned: boolean('banned').default(false),
  locked: boolean('locked').default(false),
  externalId: text('external_id'),
  publicMetadata: jsonb('public_metadata').$type<Record<string, unknown>>(),
  privateMetadata: jsonb('private_metadata').$type<Record<string, unknown>>(),
  unsafeMetadata: jsonb('unsafe_metadata').$type<Record<string, unknown>>(),
  lastSignInAt: timestamp('last_sign_in_at', {
    withTimezone: true,
    mode: 'date',
  }),
  lastActiveAt: timestamp('last_active_at', {
    withTimezone: true,
    mode: 'date',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});

export const usersRelations = relations(users, ({ many }) => ({
  organizationMemberships: many(organizationMemberships),
  organizationInvitations: many(organizationInvitations),
}));
