import { mapUserPayload } from './user.mapper';

describe('mapUserPayload', () => {
  const mockUserPayload = {
    id: 'user_2xAADz4BhfG3pa5bNEkSvohIOYz',
    object: 'user',
    first_name: 'John',
    last_name: 'Doe',
    email_addresses: [
      {
        id: 'idn_2xAADzPQ9LYRhJsVJfMrVOuDwl1',
        object: 'email_address',
        email_address: 'john@example.com',
        verification: { status: 'verified', strategy: 'ticket' },
        linked_to: [],
      },
      {
        id: 'idn_secondary',
        object: 'email_address',
        email_address: 'johndoe@gmail.com',
        verification: { status: 'verified', strategy: 'ticket' },
        linked_to: [],
      },
    ],
    primary_email_address_id: 'idn_2xAADzPQ9LYRhJsVJfMrVOuDwl1',
    image_url: 'https://img.clerk.com/xxx',
    has_image: true,
    username: 'johndoe',
    password_enabled: true,
    two_factor_enabled: false,
    banned: false,
    locked: false,
    external_id: 'ext_123',
    public_metadata: { plan: 'pro' },
    private_metadata: { stripe_id: 'cus_xxx' },
    unsafe_metadata: {},
    last_sign_in_at: 1700000000000,
    last_active_at: 1700000100000,
    created_at: 1690000000000,
    updated_at: 1700000200000,
    phone_numbers: [],
    web3_wallets: [],
    external_accounts: [],
    primary_phone_number_id: null,
    primary_web3_wallet_id: null,
    profile_image_url: 'https://www.gravatar.com/avatar?d=mp',
  } as any; // Cast as any to avoid needing every UserJSON field

  it('should map basic user fields correctly', () => {
    const result = mapUserPayload(mockUserPayload);

    expect(result.clerkId).toBe('user_2xAADz4BhfG3pa5bNEkSvohIOYz');
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Doe');
    expect(result.imageUrl).toBe('https://img.clerk.com/xxx');
    expect(result.username).toBe('johndoe');
    expect(result.externalId).toBe('ext_123');
  });

  it('should extract primary email from email_addresses using primary_email_address_id', () => {
    const result = mapUserPayload(mockUserPayload);

    expect(result.email).toBe('john@example.com');
  });

  it('should return null email when primary_email_address_id is null', () => {
    const payload = {
      ...mockUserPayload,
      primary_email_address_id: null,
    };

    const result = mapUserPayload(payload);

    expect(result.email).toBeNull();
  });

  it('should return null email when email_addresses array does not contain the primary', () => {
    const payload = {
      ...mockUserPayload,
      primary_email_address_id: 'idn_nonexistent',
    };

    const result = mapUserPayload(payload);

    expect(result.email).toBeNull();
  });

  it('should convert Unix millisecond timestamps to Date objects', () => {
    const result = mapUserPayload(mockUserPayload);

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.lastSignInAt).toBeInstanceOf(Date);
    expect(result.lastActiveAt).toBeInstanceOf(Date);

    expect(result.createdAt.getTime()).toBe(1690000000000);
    expect(result.updatedAt.getTime()).toBe(1700000200000);
    expect(result.lastSignInAt!.getTime()).toBe(1700000000000);
    expect(result.lastActiveAt!.getTime()).toBe(1700000100000);
  });

  it('should handle null timestamps for lastSignInAt and lastActiveAt', () => {
    const payload = {
      ...mockUserPayload,
      last_sign_in_at: null,
      last_active_at: null,
    };

    const result = mapUserPayload(payload);

    expect(result.lastSignInAt).toBeNull();
    expect(result.lastActiveAt).toBeNull();
  });

  it('should pass metadata objects through as-is', () => {
    const result = mapUserPayload(mockUserPayload);

    expect(result.publicMetadata).toEqual({ plan: 'pro' });
    expect(result.privateMetadata).toEqual({ stripe_id: 'cus_xxx' });
    expect(result.unsafeMetadata).toEqual({});
  });

  it('should map boolean fields correctly', () => {
    const result = mapUserPayload(mockUserPayload);

    expect(result.passwordEnabled).toBe(true);
    expect(result.twoFactorEnabled).toBe(false);
    expect(result.banned).toBe(false);
    expect(result.locked).toBe(false);
  });

  it('should map boolean fields when they are true', () => {
    const payload = {
      ...mockUserPayload,
      two_factor_enabled: true,
      banned: true,
      locked: true,
    };

    const result = mapUserPayload(payload);

    expect(result.twoFactorEnabled).toBe(true);
    expect(result.banned).toBe(true);
    expect(result.locked).toBe(true);
  });

  it('should map hasImage from has_image', () => {
    const result = mapUserPayload(mockUserPayload);

    expect(result.hasImage).toBe(true);
  });

  it('should select the correct email when there are multiple addresses', () => {
    const payload = {
      ...mockUserPayload,
      primary_email_address_id: 'idn_secondary',
    };

    const result = mapUserPayload(payload);

    expect(result.email).toBe('johndoe@gmail.com');
  });
});
