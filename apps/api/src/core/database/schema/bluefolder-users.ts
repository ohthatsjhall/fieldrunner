import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

export const bluefolderUsers = pgTable(
  'bluefolder_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id)
      .notNull(),
    bluefolderId: integer('bluefolder_id').notNull(),
    displayName: text('display_name').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    userName: text('user_name'),
    userType: text('user_type'),
    inactive: boolean('inactive').default(false).notNull(),
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
  (t) => [
    unique('uq_org_bluefolder_user').on(t.organizationId, t.bluefolderId),
  ],
);

export const bluefolderUsersRelations = relations(
  bluefolderUsers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [bluefolderUsers.organizationId],
      references: [organizations.id],
    }),
  }),
);
