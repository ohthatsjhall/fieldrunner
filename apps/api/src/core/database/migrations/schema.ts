import { pgTable, foreignKey, unique, uuid, text, jsonb, timestamp, integer, boolean, numeric, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const organizationMemberships = pgTable("organization_memberships", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkId: text("clerk_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: text().notNull(),
	roleName: text("role_name"),
	permissions: jsonb(),
	publicMetadata: jsonb("public_metadata"),
	privateMetadata: jsonb("private_metadata"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_memberships_organization_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "organization_memberships_user_id_users_id_fk"
		}),
	unique("organization_memberships_clerk_id_unique").on(table.clerkId),
]);

export const organizationDomains = pgTable("organization_domains", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkId: text("clerk_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	name: text().notNull(),
	enrollmentMode: text("enrollment_mode"),
	affiliationEmailAddress: text("affiliation_email_address"),
	verification: jsonb(),
	totalPendingInvitations: integer("total_pending_invitations").default(0),
	totalPendingSuggestions: integer("total_pending_suggestions").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_domains_organization_id_organizations_id_fk"
		}),
	unique("organization_domains_clerk_id_unique").on(table.clerkId),
]);

export const webhookEvents = pgTable("webhook_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkEventId: text("clerk_event_id").notNull(),
	eventType: text("event_type").notNull(),
	payload: jsonb().notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	error: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("webhook_events_clerk_event_id_unique").on(table.clerkEventId),
]);

export const organizationSettings = pgTable("organization_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	bluefolderApiKey: text("bluefolder_api_key"),
	bluefolderApiKeyHint: text("bluefolder_api_key_hint"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_settings_organization_id_organizations_id_fk"
		}),
	unique("organization_settings_organization_id_unique").on(table.organizationId),
]);

export const serviceRequests = pgTable("service_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	bluefolderId: integer("bluefolder_id").notNull(),
	description: text().default(').notNull(),
	status: text().default(').notNull(),
	priority: text().default(').notNull(),
	priorityLabel: text("priority_label").default(').notNull(),
	type: text().default(').notNull(),
	customerName: text("customer_name").default(').notNull(),
	customerId: integer("customer_id"),
	isOpen: boolean("is_open").default(true).notNull(),
	isOverdue: boolean("is_overdue").default(false).notNull(),
	billableTotal: numeric("billable_total", { precision: 12, scale:  2 }).default('0'),
	costTotal: numeric("cost_total", { precision: 12, scale:  2 }).default('0'),
	dateTimeCreated: timestamp("date_time_created", { withTimezone: true, mode: 'string' }),
	dateTimeClosed: timestamp("date_time_closed", { withTimezone: true, mode: 'string' }),
	syncedAt: timestamp("synced_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "service_requests_organization_id_organizations_id_fk"
		}),
	unique("uq_org_bluefolder").on(table.organizationId, table.bluefolderId),
]);

export const organizationInvitations = pgTable("organization_invitations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkId: text("clerk_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	emailAddress: text("email_address").notNull(),
	role: text().notNull(),
	roleName: text("role_name"),
	status: text().notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	userId: uuid("user_id"),
	publicMetadata: jsonb("public_metadata"),
	privateMetadata: jsonb("private_metadata"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.organizationId],
			foreignColumns: [organizations.id],
			name: "organization_invitations_organization_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "organization_invitations_user_id_users_id_fk"
		}),
	unique("organization_invitations_clerk_id_unique").on(table.clerkId),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkId: text("clerk_id").notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	email: text(),
	imageUrl: text("image_url"),
	hasImage: boolean("has_image").default(false),
	username: text(),
	passwordEnabled: boolean("password_enabled").default(false),
	twoFactorEnabled: boolean("two_factor_enabled").default(false),
	banned: boolean().default(false),
	locked: boolean().default(false),
	externalId: text("external_id"),
	publicMetadata: jsonb("public_metadata"),
	privateMetadata: jsonb("private_metadata"),
	unsafeMetadata: jsonb("unsafe_metadata"),
	lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true, mode: 'string' }),
	lastActiveAt: timestamp("last_active_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("users_clerk_id_unique").on(table.clerkId),
]);

export const permissions = pgTable("permissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkId: text("clerk_id").notNull(),
	key: text().notNull(),
	name: text().notNull(),
	description: text(),
	type: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("permissions_clerk_id_unique").on(table.clerkId),
	unique("permissions_key_unique").on(table.key),
]);

export const organizations = pgTable("organizations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkId: text("clerk_id").notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	imageUrl: text("image_url"),
	hasImage: boolean("has_image").default(false),
	createdBy: text("created_by"),
	maxAllowedMemberships: integer("max_allowed_memberships"),
	membersCount: integer("members_count").default(0),
	pendingInvitationsCount: integer("pending_invitations_count").default(0),
	adminDeleteEnabled: boolean("admin_delete_enabled").default(true),
	publicMetadata: jsonb("public_metadata"),
	privateMetadata: jsonb("private_metadata"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("organizations_clerk_id_unique").on(table.clerkId),
	unique("organizations_slug_unique").on(table.slug),
]);

export const roles = pgTable("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clerkId: text("clerk_id").notNull(),
	key: text().notNull(),
	name: text().notNull(),
	description: text(),
	isCreatorEligible: boolean("is_creator_eligible").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	unique("roles_clerk_id_unique").on(table.clerkId),
	unique("roles_key_unique").on(table.key),
]);

export const rolePermissions = pgTable("role_permissions", {
	roleId: uuid("role_id").notNull(),
	permissionId: uuid("permission_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "role_permissions_role_id_roles_id_fk"
		}),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "role_permissions_permission_id_permissions_id_fk"
		}),
	primaryKey({ columns: [table.roleId, table.permissionId], name: "role_permissions_role_id_permission_id_pk"}),
]);
