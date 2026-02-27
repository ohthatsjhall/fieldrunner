import {
  decimal,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './organizations';

export const vendors = pgTable(
  'vendors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id)
      .notNull(),
    name: text('name').notNull(),
    phone: text('phone'),
    phoneRaw: text('phone_raw'),
    address: text('address'),
    streetAddress: text('street_address'),
    city: text('city'),
    state: text('state'),
    postalCode: text('postal_code'),
    country: text('country'),
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),
    website: text('website'),
    googlePlaceId: text('google_place_id'),
    rating: decimal('rating', { precision: 3, scale: 2 }),
    reviewCount: integer('review_count'),
    categories: jsonb('categories').$type<string[]>(),
    sourceCount: integer('source_count').default(1).notNull(),
    lastSeenAt: timestamp('last_seen_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
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
    unique('uq_org_vendor_phone').on(t.organizationId, t.phone),
  ],
);

export const vendorsRelations = relations(vendors, ({ one }) => ({
  organization: one(organizations, {
    fields: [vendors.organizationId],
    references: [organizations.id],
  }),
}));
