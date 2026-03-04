export function parseStatusChange(
  description: string,
): { fromStatus: string | null; toStatus: string } | null {
  // "Status changed from [X] to [Y]."
  const fullMatch = description.match(
    /Status changed from \[(.+?)\] to \[(.+?)\]/i,
  );
  if (fullMatch) {
    return { fromStatus: fullMatch[1].trim(), toStatus: fullMatch[2].trim() };
  }

  // "Status changed to [Y]."
  const toOnlyMatch = description.match(/Status changed to \[(.+?)\]/i);
  if (toOnlyMatch) {
    return { fromStatus: null, toStatus: toOnlyMatch[1].trim() };
  }

  return null;
}
