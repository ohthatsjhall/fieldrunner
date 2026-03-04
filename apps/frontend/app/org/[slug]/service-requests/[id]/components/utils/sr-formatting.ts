export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function getCustomField(
  fields: { name: string; value: string }[],
  ...names: string[]
): string | undefined {
  const lower = names.map((n) => n.toLowerCase());
  const match = fields.find((f) => lower.includes(f.name.toLowerCase()));
  return match?.value || undefined;
}

export function formatDate(
  iso: string | null | undefined,
  fallback = 'TBD',
): string {
  if (!iso) return fallback;
  return new Date(iso).toLocaleDateString();
}

export function formatCurrency(
  amount: string | number | undefined,
  fallback = 'N/A',
): string {
  if (amount === undefined || amount === '') return fallback;
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return fallback;
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
