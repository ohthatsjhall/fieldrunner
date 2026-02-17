export interface AuthUser {
  userId: string;
  sessionId: string;
}

export interface AuthOrganization {
  orgId: string;
  orgSlug: string;
  orgRole: string;
}
