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
import { vendors } from './vendors';

export const vendorSourceRecords = pgTable(
  'vendor_source_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    vendorId: uuid('vendor_id')
      .references(() => vendors.id)
      .notNull(),
    source: text('source').notNull(),
    sourceId: text('source_id').notNull(),
    rawData: jsonb('raw_data').$type<Record<string, unknown>>(),
    name: text('name'),
    address: text('address'),
    phone: text('phone'),
    rating: decimal('rating', { precision: 3, scale: 2 }),
    reviewCount: integer('review_count'),
    website: text('website'),
    types: jsonb('types').$type<string[]>(),
    businessHours: jsonb('business_hours').$type<Record<string, unknown>>(),
    fetchedAt: timestamp('fetched_at', {
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
    unique('uq_vendor_source').on(t.vendorId, t.source, t.sourceId),
  ],
);

export const vendorSourceRecordsRelations = relations(
  vendorSourceRecords,
  ({ one }) => ({
    vendor: one(vendors, {
      fields: [vendorSourceRecords.vendorId],
      references: [vendors.id],
    }),
  }),
);
