// Pozycje strony /links współdzielone przez przeglądarkę (src/). Plik nie może importować niczego spoza `shared/`.

export const LINK_KINDS = ['link', 'donate', 'newsletter', 'join', 'instagram', 'linkedin'] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const LINK_ICONS = ['link', 'clipboard', 'download', 'globe', 'envelope', 'heart', 'user-plus', 'instagram', 'linkedin'] as const;
export type LinkIcon = (typeof LINK_ICONS)[number];

export const LINK_ICON_LABELS: Record<LinkIcon, string> = {
  link: 'Łącze',
  clipboard: 'Formularz',
  download: 'Pobieranie',
  globe: 'Strona WWW',
  envelope: 'Koperta',
  heart: 'Serce',
  'user-plus': 'Dołącz',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

export const LINK_KIND_LABELS: Record<LinkKind, string> = {
  link: 'Link',
  donate: 'Okno darowizny',
  newsletter: 'Okno newslettera',
  join: 'Ankieta „Dołącz do nas” (adres z ustawień)',
  instagram: 'Instagram (adres z ustawień)',
  linkedin: 'LinkedIn (adres z ustawień)',
};

export const LINK_LIMITS = { title: 120, description: 200, url: 500 } as const;

/** Adres wewnętrzny (`/materialy`) albo zewnętrzny http(s). Odrzuca `javascript:`, `//host` i białe znaki; zgodne z CHECK w bazie. */
export const LINK_URL_RE = /^(https?:\/\/\S+|\/[^/\s]\S*|\/)$/;

export const isValidLinkUrl = (value: string): boolean => value.length <= LINK_LIMITS.url && LINK_URL_RE.test(value);
