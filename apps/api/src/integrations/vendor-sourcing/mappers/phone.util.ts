/**
 * Normalize a phone number to E.164 format.
 * Assumes US/CA (+1) for 10-digit numbers.
 * Returns null if the input cannot be parsed as a valid phone number.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;

  // Strip extensions (ext, ext., x, etc.)
  let cleaned = raw.replace(/\s*(ext\.?|x)\s*\d+$/i, '').trim();

  // Strip all non-digit characters except leading +
  const hasPlus = cleaned.startsWith('+');
  cleaned = cleaned.replace(/\D/g, '');

  if (cleaned.length < 7) return null;

  // Already has country code via + prefix
  if (hasPlus) {
    return `+${cleaned}`;
  }

  // 10-digit US number → add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // 11-digit starting with 1 → US number
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // Other lengths without + prefix — can't determine country code reliably
  return null;
}

/**
 * Compare two phone numbers by their normalized E.164 form.
 */
export function isSamePhone(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
}
