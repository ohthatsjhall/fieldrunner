import { mapInvitationPayload } from './invitation.mapper';

describe('mapInvitationPayload', () => {
  const mockInvitationPayload = {
    id: 'orginv_2xAADz4BhfG3pa5bNEkSvohIOYz',
    object: 'organization_invitation',
    email_address: 'invitee@example.com',
    role: 'org:member',
    role_name: 'Member',
    organization_id: 'org_abc123',
    status: 'pending',
    expires_at: 1700100000000,
    public_metadata: { source: 'admin_invite' },
    private_metadata: { internal_note: 'VIP' },
    url: null,
    created_at: 1690000000000,
    updated_at: 1700000200000,
  } as any;

  it('should map basic invitation fields correctly', () => {
    const result = mapInvitationPayload(mockInvitationPayload);

    expect(result.clerkId).toBe('orginv_2xAADz4BhfG3pa5bNEkSvohIOYz');
    expect(result.emailAddress).toBe('invitee@example.com');
    expect(result.role).toBe('org:member');
    expect(result.roleName).toBe('Member');
    expect(result.status).toBe('pending');
  });

  it('should return clerkOrganizationId for FK resolution', () => {
    const result = mapInvitationPayload(mockInvitationPayload);

    expect(result.clerkOrganizationId).toBe('org_abc123');
  });

  it('should convert Unix millisecond timestamps to Date objects', () => {
    const result = mapInvitationPayload(mockInvitationPayload);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(1690000000000);
    expect(result.updatedAt.getTime()).toBe(1700000200000);
  });

  it('should convert expiresAt timestamp to Date object', () => {
    const result = mapInvitationPayload(mockInvitationPayload);

    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt!.getTime()).toBe(1700100000000);
  });

  it('should handle null expiresAt', () => {
    const payload = {
      ...mockInvitationPayload,
      expires_at: null,
    };

    const result = mapInvitationPayload(payload);

    expect(result.expiresAt).toBeNull();
  });

  it('should handle zero expiresAt as falsy', () => {
    const payload = {
      ...mockInvitationPayload,
      expires_at: 0,
    };

    const result = mapInvitationPayload(payload);

    expect(result.expiresAt).toBeNull();
  });

  it('should pass metadata objects through as-is', () => {
    const result = mapInvitationPayload(mockInvitationPayload);

    expect(result.publicMetadata).toEqual({ source: 'admin_invite' });
    expect(result.privateMetadata).toEqual({ internal_note: 'VIP' });
  });

  it('should handle null metadata', () => {
    const payload = {
      ...mockInvitationPayload,
      public_metadata: null,
      private_metadata: null,
    };

    const result = mapInvitationPayload(payload);

    expect(result.publicMetadata).toBeNull();
    expect(result.privateMetadata).toBeNull();
  });

  it('should handle null roleName', () => {
    const payload = {
      ...mockInvitationPayload,
      role_name: null,
    };

    const result = mapInvitationPayload(payload);

    expect(result.roleName).toBeNull();
  });

  it('should handle undefined roleName', () => {
    const payload = {
      ...mockInvitationPayload,
      role_name: undefined,
    };

    const result = mapInvitationPayload(payload);

    expect(result.roleName).toBeNull();
  });

  it('should default status to pending when undefined', () => {
    const payload = {
      ...mockInvitationPayload,
      status: undefined,
    };

    const result = mapInvitationPayload(payload);

    expect(result.status).toBe('pending');
  });
});
