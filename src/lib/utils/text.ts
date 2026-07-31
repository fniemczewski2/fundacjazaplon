/**
 * Normalizuje dowolny tekst do bezpiecznej postaci ASCII: usuwa polskie/obce
 * znaki diakrytyczne, cudzysłowy i myślniki typograficzne, zamienia spacje na
 * "-" i pozostawia tylko znaki [a-z0-9-] (opcjonalnie też "." i "_" — przydatne
 * dla nazw plików, gdzie chcemy zachować rozszerzenie).
 *
 * Wcześniej ta sama logika była zduplikowana niemal 1:1 w `lib/documents.ts`,
 * `lib/media.ts` (jako `sanitizeFileName`) i `lib/post.ts` (jako `slugify`).
 */
export function toSafeSlug(input: string, opts: { keepDots?: boolean } = {}): string {
  const base = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'"]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .trim();

  const disallowed = opts.keepDots ? /[^a-z0-9._-]/g : /[^a-z0-9-]/g;

  return base
    .replace(disallowed, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Wariant dedykowany nazwom plików — zawsze zwraca niepustą wartość. */
export function toSafeFileName(name: string): string {
  const safe = toSafeSlug(name, { keepDots: true });
  return safe || `plik-${Date.now()}`;
}
