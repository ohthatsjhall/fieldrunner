import type { ValidEmail } from '@fieldrunner/shared';

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const NOREPLY_RE = /^(no-?reply|do-?not-?reply)@/;

export function normalizeEmail(
  raw: string | null | undefined,
): ValidEmail | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  if (!EMAIL_RE.test(trimmed)) return null;
  if (NOREPLY_RE.test(trimmed)) return null;
  return trimmed as ValidEmail;
}
