import { mapBlueFolderUser } from './bluefolder-user.mapper';
import type { BfUser } from '../types/bluefolder-api.types';

function makeBfUser(overrides: Partial<BfUser> = {}): BfUser {
  return {
    userId: '42',
    firstName: 'Jane',
    lastName: 'Doe',
    displayName: 'Jane Doe',
    inactive: 'false',
    userName: 'jdoe',
    userType: 'Admin',
    ...overrides,
  };
}

describe('mapBlueFolderUser', () => {
  it('should map all fields correctly', () => {
    const result = mapBlueFolderUser(makeBfUser());

    expect(result).toEqual({
      bluefolderId: 42,
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: 'Jane Doe',
      inactive: false,
      userName: 'jdoe',
      userType: 'Admin',
    });
  });

  it('should coerce userId string to number', () => {
    const result = mapBlueFolderUser(makeBfUser({ userId: '999' }));
    expect(result.bluefolderId).toBe(999);
  });

  it('should coerce inactive "true" to boolean true', () => {
    const result = mapBlueFolderUser(makeBfUser({ inactive: 'true' }));
    expect(result.inactive).toBe(true);
  });

  it('should coerce inactive "false" to boolean false', () => {
    const result = mapBlueFolderUser(makeBfUser({ inactive: 'false' }));
    expect(result.inactive).toBe(false);
  });

  it('should handle empty strings as null for optional fields', () => {
    const result = mapBlueFolderUser(
      makeBfUser({
        firstName: '',
        lastName: '',
        userName: '',
        userType: '',
      }),
    );

    expect(result.firstName).toBeNull();
    expect(result.lastName).toBeNull();
    expect(result.userName).toBeNull();
    expect(result.userType).toBeNull();
  });

  it('should return 0 for invalid userId', () => {
    const result = mapBlueFolderUser(makeBfUser({ userId: 'abc' }));
    expect(result.bluefolderId).toBe(0);
  });

  it('should preserve displayName even when empty', () => {
    const result = mapBlueFolderUser(makeBfUser({ displayName: '' }));
    expect(result.displayName).toBe('');
  });
});
