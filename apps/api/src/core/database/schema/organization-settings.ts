import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

export const organizationSettings = pgTable('organization_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id)
    .unique()
    .notNull(),
  bluefolderApiKey: text('bluefolder_api_key'),
  bluefolderApiKeyHint: text('bluefolder_api_key_hint'),
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

export const organizationSettingsRelations = relations(
  organizationSettings,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationSettings.organizationId],
      references: [organizations.id],
    }),
  }),
);
