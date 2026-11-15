// Typy sekcji „Instagram” współdzielone przez przeglądarkę (src/) i funkcje serwerowe (api/).
// Plik nie może importować niczego spoza `shared/`.

export type InstagramPost = {
  id: string;
  caption: string;
  /** Adres obrazu (zdjęcie albo miniatura wideo) z CDN Instagrama; null, gdy brak. */
  image: string | null;
  permalink: string;
  /** ISO 8601. */
  date: string;
};

export type InstagramConnectionStatus = {
  configured: boolean;
  /** Nazwy brakujących zmiennych środowiskowych (tylko gdy configured = false). */
  missing: string[];
  ok: boolean;
  status: number | null;
  error: string | null;
  postCount: number | null;
};
