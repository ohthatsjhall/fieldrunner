import { mapPermissionPayload } from './permission.mapper';

describe('mapPermissionPayload', () => {
  const mockPermissionPayload = {
    id: 'perm_2xAADz4BhfG3pa5bNEkSvohIOYz',
    object: 'permission',
    key: 'org:documents:read',
    name: 'Read Documents',
    description: 'Allows reading documents within the organization',
    created_at: 1690000000000,
    updated_at: 1700000200000,
  } as any;

  it('should map basic permission fields correctly', () => {
    const result = mapPermissionPayload(mockPermissionPayload);

    expect(result.clerkId).toBe('perm_2xAADz4BhfG3pa5bNEkSvohIOYz');
    expect(result.key).toBe('org:documents:read');
    expect(result.name).toBe('Read Documents');
    expect(result.description).toBe(
      'Allows reading documents within the organization',
    );
  });

  it('should set type to null (not present in PermissionJSON)', () => {
    const result = mapPermissionPayload(mockPermissionPayload);

    expect(result.type).toBeNull();
  });

  it('should convert Unix millisecond timestamps to Date objects', () => {
    const result = mapPermissionPayload(mockPermissionPayload);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(1690000000000);
    expect(result.updatedAt.getTime()).toBe(1700000200000);
  });

  it('should handle null description', () => {
    const payload = {
      ...mockPermissionPayload,
      description: null,
    };

    const result = mapPermissionPayload(payload);

    expect(result.description).toBeNull();
  });

  it('should handle undefined description', () => {
    const payload = {
      ...mockPermissionPayload,
      description: undefined,
    };

    const result = mapPermissionPayload(payload);

    expect(result.description).toBeNull();
  });
});
