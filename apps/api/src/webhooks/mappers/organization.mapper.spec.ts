import { mapOrganizationPayload } from './organization.mapper';

describe('mapOrganizationPayload', () => {
  const mockOrganizationPayload = {
    id: 'org_2xBBEz5ChfH4qb6cOFlTwpiJPAb',
    object: 'organization',
    name: 'Acme Inc',
    slug: 'acme-inc',
    image_url: 'https://img.clerk.com/org-xxx',
    has_image: true,
    created_by: 'user_2xAADz4BhfG3pa5bNEkSvohIOYz',
    max_allowed_memberships: 100,
    members_count: 5,
    pending_invitations_count: 2,
    admin_delete_enabled: true,
    public_metadata: { tier: 'enterprise' },
    private_metadata: { internal_id: 'int_456' },
    created_at: 1690000000000,
    updated_at: 1700000200000,
  } as any; // Cast as any to avoid needing every OrganizationJSON field

  it('should map all organization fields correctly', () => {
    const result = mapOrganizationPayload(mockOrganizationPayload);

    expect(result.clerkId).toBe('org_2xBBEz5ChfH4qb6cOFlTwpiJPAb');
    expect(result.name).toBe('Acme Inc');
    expect(result.slug).toBe('acme-inc');
    expect(result.imageUrl).toBe('https://img.clerk.com/org-xxx');
    expect(result.hasImage).toBe(true);
    expect(result.createdBy).toBe('user_2xAADz4BhfG3pa5bNEkSvohIOYz');
    expect(result.maxAllowedMemberships).toBe(100);
    expect(result.membersCount).toBe(5);
    expect(result.pendingInvitationsCount).toBe(2);
    expect(result.adminDeleteEnabled).toBe(true);
  });

  it('should convert timestamps to Date objects', () => {
    const result = mapOrganizationPayload(mockOrganizationPayload);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(1690000000000);
    expect(result.updatedAt.getTime()).toBe(1700000200000);
  });

  it('should default membersCount to 0 when null', () => {
    const payload = {
      ...mockOrganizationPayload,
      members_count: null,
    };

    const result = mapOrganizationPayload(payload);

    expect(result.membersCount).toBe(0);
  });

  it('should default pendingInvitationsCount to 0 when null', () => {
    const payload = {
      ...mockOrganizationPayload,
      pending_invitations_count: null,
    };

    const result = mapOrganizationPayload(payload);

    expect(result.pendingInvitationsCount).toBe(0);
  });

  it('should default both counts to 0 when both are null', () => {
    const payload = {
      ...mockOrganizationPayload,
      members_count: null,
      pending_invitations_count: null,
    };

    const result = mapOrganizationPayload(payload);

    expect(result.membersCount).toBe(0);
    expect(result.pendingInvitationsCount).toBe(0);
  });

  it('should pass metadata through as-is', () => {
    const result = mapOrganizationPayload(mockOrganizationPayload);

    expect(result.publicMetadata).toEqual({ tier: 'enterprise' });
    expect(result.privateMetadata).toEqual({ internal_id: 'int_456' });
  });

  it('should handle empty metadata objects', () => {
    const payload = {
      ...mockOrganizationPayload,
      public_metadata: {},
      private_metadata: {},
    };

    const result = mapOrganizationPayload(payload);

    expect(result.publicMetadata).toEqual({});
    expect(result.privateMetadata).toEqual({});
  });

  it('should map hasImage as false when has_image is false', () => {
    const payload = {
      ...mockOrganizationPayload,
      has_image: false,
    };

    const result = mapOrganizationPayload(payload);

    expect(result.hasImage).toBe(false);
  });

  it('should handle null maxAllowedMemberships', () => {
    const payload = {
      ...mockOrganizationPayload,
      max_allowed_memberships: null,
    };

    const result = mapOrganizationPayload(payload);

    expect(result.maxAllowedMemberships).toBeNull();
  });
});
