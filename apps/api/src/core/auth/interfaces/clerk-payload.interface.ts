export interface ClerkJwtPayload {
  sub: string;
  sid: string;
  iss: string;
  exp: number;
  iat: number;
  azp?: string;
  // v1 claims (deprecated April 2025)
  org_id?: string;
  org_slug?: string;
  org_role?: string;
  // v2 claims (compact format)
  o?: {
    id: string;
    slg: string;
    rol: string;
    per?: string;
    fpm?: string;
  };
}
