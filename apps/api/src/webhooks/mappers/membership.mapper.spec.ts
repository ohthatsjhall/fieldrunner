import { mapMembershipPayload } from './membership.mapper';

describe('mapMembershipPayload', () => {
  const mockMembershipPayload = {
    id: 'orgmem_2xCCFz6DjgI5rc7dPGmUxqkKQBc',
    object: 'organization_membership',
    organization: {
      id: 'org_2xBBEz5ChfH4qb6cOFlTwpiJPAb',
      name: 'Acme Inc',
      slug: 'acme-inc',
      image_url: 'https://img.clerk.com/org-xxx',
      has_image: true,
      members_count: 5,
      pending_invitations_count: 2,
      max_allowed_memberships: 100,
      admin_delete_enabled: true,
      public_metadata: {},
      created_at: 1690000000000,
      updated_at: 1700000200000,
    },
    public_user_data: {
      user_id: 'user_2xAADz4BhfG3pa5bNEkSvohIOYz',
      first_name: 'John',
      last_name: 'Doe',
      image_url: 'https://img.clerk.com/xxx',
      has_image: true,
      identifier: 'john@example.com',
      profile_image_url: 'https://www.gravatar.com/avatar?d=mp',
    },
    role: 'org:admin',
    role_name: 'Admin',
    permissions: ['org:documents:read', 'org:documents:write'],
    public_metadata: { team: 'engineering' },
    private_metadata: { notes: 'team lead' },
    created_at: 1690000000000,
    updated_at: 1700000200000,
  } as any; // Cast as any to avoid needing every OrganizationMembershipJSON field

  it('should map basic membership fields', () => {
    const result = mapMembershipPayload(mockMembershipPayload);

    expect(result.clerkId).toBe('orgmem_2xCCFz6DjgI5rc7dPGmUxqkKQBc');
    expect(result.role).toBe('org:admin');
  });

  it('should extract clerkOrganizationId from nested organization.id', () => {
    const result = mapMembershipPayload(mockMembershipPayload);

    expect(result.clerkOrganizationId).toBe('org_2xBBEz5ChfH4qb6cOFlTwpiJPAb');
  });

  it('should extract clerkUserId from nested public_user_data.user_id', () => {
    const result = mapMembershipPayload(mockMembershipPayload);

    expect(result.clerkUserId).toBe('user_2xAADz4BhfG3pa5bNEkSvohIOYz');
  });

  it('should map roleName from role_name field', () => {
    const result = mapMembershipPayload(mockMembershipPayload);

    expect(result.roleName).toBe('Admin');
  });

  it('should return null roleName when role_name is absent', () => {
    const { role_name: _, ...payloadWithoutRoleName } = mockMembershipPayload;
    const result = mapMembershipPayload(payloadWithoutRoleName);

    expect(result.roleName).toBeNull();
  });

  it('should map permissions array when present', () => {
    const result = mapMembershipPayload(mockMembershipPayload);

    expect(result.permissions).toEqual([
      'org:documents:read',
      'org:documents:write',
    ]);
  });

  it('should handle null permissions', () => {
    const payload = {
      ...mockMembershipPayload,
      permissions: null,
    };

    const result = mapMembershipPayload(payload);

    expect(result.permissions).toBeNull();
  });

  it('should handle undefined permissions (falls back to null via ??)', () => {
    const payload = {
      ...mockMembershipPayload,
      permissions: undefined,
    };

    const result = mapMembershipPayload(payload);

    expect(result.permissions).toBeNull();
  });

  it('should convert timestamps to Date objects', () => {
    const result = mapMembershipPayload(mockMembershipPayload);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(1690000000000);
    expect(result.updatedAt.getTime()).toBe(1700000200000);
  });

  it('should pass public_metadata through as-is', () => {
    const result = mapMembershipPayload(mockMembershipPayload);

    expect(result.publicMetadata).toEqual({ team: 'engineering' });
  });

  it('should pass private_metadata through with null fallback', () => {
    const result = mapMembershipPayload(mockMembershipPayload);

    expect(result.privateMetadata).toEqual({ notes: 'team lead' });
  });

  it('should handle undefined private_metadata gracefully', () => {
    const payload = {
      ...mockMembershipPayload,
      private_metadata: undefined,
    };

    const result = mapMembershipPayload(payload);

    expect(result.privateMetadata).toBeNull();
  });

  it('should map a member role with role_name', () => {
    const payload = {
      ...mockMembershipPayload,
      role: 'org:member',
      role_name: 'Member',
    };

    const result = mapMembershipPayload(payload);

    expect(result.role).toBe('org:member');
    expect(result.roleName).toBe('Member');
  });
});
