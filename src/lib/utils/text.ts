export function toSafeSlug(input: string, opts: { keepDots?: boolean } = {}): string {
  const base = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'"]/g, '')
    .replace(/[–-]/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .trim();

  const disallowed = opts.keepDots ? /[^a-z0-9._-]/g : /[^a-z0-9-]/g;

  return base
    .replace(disallowed, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/** Wariant dedykowany nazwom plików - zawsze zwraca niepustą wartość. */
export function toSafeFileName(name: string): string {
  const safe = toSafeSlug(name, { keepDots: true });
  return safe || `plik-${Date.now()}`;
}
