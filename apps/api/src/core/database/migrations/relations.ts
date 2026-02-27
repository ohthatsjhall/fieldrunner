import { relations } from "drizzle-orm/relations";
import { organizations, organizationMemberships, users, organizationDomains, organizationSettings, serviceRequests, organizationInvitations, roles, rolePermissions, permissions } from "./schema";

export const organizationMembershipsRelations = relations(organizationMemberships, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationMemberships.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [organizationMemberships.userId],
		references: [users.id]
	}),
}));

export const organizationsRelations = relations(organizations, ({many}) => ({
	organizationMemberships: many(organizationMemberships),
	organizationDomains: many(organizationDomains),
	organizationSettings: many(organizationSettings),
	serviceRequests: many(serviceRequests),
	organizationInvitations: many(organizationInvitations),
}));

export const usersRelations = relations(users, ({many}) => ({
	organizationMemberships: many(organizationMemberships),
	organizationInvitations: many(organizationInvitations),
}));

export const organizationDomainsRelations = relations(organizationDomains, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationDomains.organizationId],
		references: [organizations.id]
	}),
}));

export const organizationSettingsRelations = relations(organizationSettings, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationSettings.organizationId],
		references: [organizations.id]
	}),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({one}) => ({
	organization: one(organizations, {
		fields: [serviceRequests.organizationId],
		references: [organizations.id]
	}),
}));

export const organizationInvitationsRelations = relations(organizationInvitations, ({one}) => ({
	organization: one(organizations, {
		fields: [organizationInvitations.organizationId],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [organizationInvitations.userId],
		references: [users.id]
	}),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	rolePermissions: many(rolePermissions),
}));