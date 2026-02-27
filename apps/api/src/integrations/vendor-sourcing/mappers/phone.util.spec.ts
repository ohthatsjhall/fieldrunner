import { normalizePhone, isSamePhone } from './phone.util';

describe('normalizePhone', () => {
  it('should return null for null/undefined/empty input', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
  });

  it('should normalize a 10-digit US number to E.164', () => {
    expect(normalizePhone('5551234567')).toBe('+15551234567');
    expect(normalizePhone('(555) 123-4567')).toBe('+15551234567');
    expect(normalizePhone('555-123-4567')).toBe('+15551234567');
    expect(normalizePhone('555.123.4567')).toBe('+15551234567');
  });

  it('should normalize an 11-digit US number starting with 1', () => {
    expect(normalizePhone('15551234567')).toBe('+15551234567');
    expect(normalizePhone('1-555-123-4567')).toBe('+15551234567');
    expect(normalizePhone('1 (555) 123-4567')).toBe('+15551234567');
  });

  it('should preserve numbers already in E.164 format', () => {
    expect(normalizePhone('+15551234567')).toBe('+15551234567');
  });

  it('should handle numbers with extensions by stripping them', () => {
    expect(normalizePhone('(555) 123-4567 ext. 100')).toBe('+15551234567');
    expect(normalizePhone('555-123-4567 x100')).toBe('+15551234567');
    expect(normalizePhone('555-123-4567 ext 100')).toBe('+15551234567');
  });

  it('should return null for numbers that are too short', () => {
    expect(normalizePhone('555')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
  });

  it('should return null for non-phone strings', () => {
    expect(normalizePhone('not a phone')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
  });

  it('should handle international format with + prefix', () => {
    expect(normalizePhone('+442071234567')).toBe('+442071234567');
    expect(normalizePhone('+61412345678')).toBe('+61412345678');
  });
});

describe('isSamePhone', () => {
  it('should return true for matching normalized numbers', () => {
    expect(isSamePhone('(555) 123-4567', '555-123-4567')).toBe(true);
    expect(isSamePhone('+15551234567', '5551234567')).toBe(true);
  });

  it('should return false for different numbers', () => {
    expect(isSamePhone('(555) 123-4567', '(555) 123-9999')).toBe(false);
  });

  it('should return false if either is null/undefined', () => {
    expect(isSamePhone(null, '555-123-4567')).toBe(false);
    expect(isSamePhone('555-123-4567', null)).toBe(false);
    expect(isSamePhone(null, null)).toBe(false);
  });
});
