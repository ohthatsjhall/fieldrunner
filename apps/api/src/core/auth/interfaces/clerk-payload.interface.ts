export interface ClerkJwtPayload {
  sub: string;
  sid: string;
  iss: string;
  exp: number;
  iat: number;
  azp?: string;
  org_id?: string;
  org_slug?: string;
  org_role?: string;
}
