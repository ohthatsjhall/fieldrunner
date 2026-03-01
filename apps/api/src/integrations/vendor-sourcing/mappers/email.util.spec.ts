import { normalizeEmail } from './email.util';

describe('normalizeEmail', () => {
  it('should return null for null/undefined/empty input', () => {
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail('   ')).toBeNull();
  });

  it('should lowercase and trim a valid email', () => {
    expect(normalizeEmail('  John@Example.COM  ')).toBe('john@example.com');
  });

  it('should accept standard business emails', () => {
    expect(normalizeEmail('contact@acmeplumbing.com')).toBe(
      'contact@acmeplumbing.com',
    );
    expect(normalizeEmail('john.doe@company.co.uk')).toBe(
      'john.doe@company.co.uk',
    );
  });

  it('should reject noreply/no-reply addresses', () => {
    expect(normalizeEmail('noreply@example.com')).toBeNull();
    expect(normalizeEmail('no-reply@example.com')).toBeNull();
    expect(normalizeEmail('NOREPLY@Example.com')).toBeNull();
    expect(normalizeEmail('do-not-reply@example.com')).toBeNull();
    expect(normalizeEmail('donotreply@example.com')).toBeNull();
  });

  it('should reject invalid email formats', () => {
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(normalizeEmail('@missing-local.com')).toBeNull();
    expect(normalizeEmail('missing-domain@')).toBeNull();
    expect(normalizeEmail('spaces in@email.com')).toBeNull();
    expect(normalizeEmail('multiple@@at.com')).toBeNull();
  });

  it('should reject emails with no TLD', () => {
    expect(normalizeEmail('user@localhost')).toBeNull();
  });

  it('should accept emails with subdomains', () => {
    expect(normalizeEmail('info@mail.company.com')).toBe(
      'info@mail.company.com',
    );
  });

  it('should accept emails with plus addressing', () => {
    expect(normalizeEmail('user+tag@example.com')).toBe(
      'user+tag@example.com',
    );
  });

  it('should accept emails with hyphens and dots in local part', () => {
    expect(normalizeEmail('first.last@example.com')).toBe(
      'first.last@example.com',
    );
    expect(normalizeEmail('first-last@example.com')).toBe(
      'first-last@example.com',
    );
  });
});
