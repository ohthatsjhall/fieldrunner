import { mapDomainPayload } from './domain.mapper';

describe('mapDomainPayload', () => {
  const mockDomainPayload = {
    id: 'orgdmn_2xAADz4BhfG3pa5bNEkSvohIOYz',
    object: 'organization_domain',
    name: 'example.com',
    organization_id: 'org_abc123',
    enrollment_mode: 'automatic_invitation',
    affiliation_email_address: 'admin@example.com',
    verification: {
      status: 'verified',
      strategy: 'dns',
      attempts: 1,
      expires_at: 1700100000000,
    },
    total_pending_invitations: 3,
    total_pending_suggestions: 5,
    created_at: 1690000000000,
    updated_at: 1700000200000,
  } as any;

  it('should map basic domain fields correctly', () => {
    const result = mapDomainPayload(mockDomainPayload);

    expect(result.clerkId).toBe('orgdmn_2xAADz4BhfG3pa5bNEkSvohIOYz');
    expect(result.name).toBe('example.com');
    expect(result.enrollmentMode).toBe('automatic_invitation');
    expect(result.affiliationEmailAddress).toBe('admin@example.com');
    expect(result.totalPendingInvitations).toBe(3);
    expect(result.totalPendingSuggestions).toBe(5);
  });

  it('should return clerkOrganizationId for FK resolution', () => {
    const result = mapDomainPayload(mockDomainPayload);

    expect(result.clerkOrganizationId).toBe('org_abc123');
  });

  it('should pass verification through as JSONB', () => {
    const result = mapDomainPayload(mockDomainPayload);

    expect(result.verification).toEqual({
      status: 'verified',
      strategy: 'dns',
      attempts: 1,
      expires_at: 1700100000000,
    });
  });

  it('should handle null verification', () => {
    const payload = {
      ...mockDomainPayload,
      verification: null,
    };

    const result = mapDomainPayload(payload);

    expect(result.verification).toBeNull();
  });

  it('should handle null affiliation email address', () => {
    const payload = {
      ...mockDomainPayload,
      affiliation_email_address: null,
    };

    const result = mapDomainPayload(payload);

    expect(result.affiliationEmailAddress).toBeNull();
  });

  it('should convert Unix millisecond timestamps to Date objects', () => {
    const result = mapDomainPayload(mockDomainPayload);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(1690000000000);
    expect(result.updatedAt.getTime()).toBe(1700000200000);
  });
});
