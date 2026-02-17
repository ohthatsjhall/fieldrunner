export type User = {
  id: string;
  clerkId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  imageUrl: string | null;
  hasImage: boolean | null;
  username: string | null;
  passwordEnabled: boolean | null;
  twoFactorEnabled: boolean | null;
  banned: boolean | null;
  locked: boolean | null;
  externalId: string | null;
  publicMetadata: Record<string, unknown> | null;
  privateMetadata: Record<string, unknown> | null;
  unsafeMetadata: Record<string, unknown> | null;
  lastSignInAt: Date | null;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type Organization = {
  id: string;
  clerkId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  hasImage: boolean | null;
  createdBy: string | null;
  maxAllowedMemberships: number | null;
  membersCount: number | null;
  pendingInvitationsCount: number | null;
  adminDeleteEnabled: boolean | null;
  publicMetadata: Record<string, unknown> | null;
  privateMetadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type OrganizationMembership = {
  id: string;
  clerkId: string;
  organizationId: string;
  userId: string;
  role: string;
  roleName: string | null;
  permissions: string[] | null;
  publicMetadata: Record<string, unknown> | null;
  privateMetadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type OrganizationInvitation = {
  id: string;
  clerkId: string;
  organizationId: string;
  emailAddress: string;
  role: string;
  roleName: string | null;
  status: string;
  expiresAt: Date | null;
  userId: string | null;
  publicMetadata: Record<string, unknown> | null;
  privateMetadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type OrganizationDomain = {
  id: string;
  clerkId: string;
  organizationId: string;
  name: string;
  enrollmentMode: string | null;
  affiliationEmailAddress: string | null;
  verification: Record<string, unknown> | null;
  totalPendingInvitations: number | null;
  totalPendingSuggestions: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type Role = {
  id: string;
  clerkId: string;
  key: string;
  name: string;
  description: string | null;
  isCreatorEligible: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type Permission = {
  id: string;
  clerkId: string;
  key: string;
  name: string;
  description: string | null;
  type: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type RolePermission = {
  roleId: string;
  permissionId: string;
};
