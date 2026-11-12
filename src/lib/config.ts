/** Stałe aplikacji przeglądarkowej w jednym miejscu. Limity plików i czasy cache nie powinny być rozsiane po modułach. */

export const SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || 'https://zaplon.org.pl').replace(/\/$/, '');
export const SITE_NAME = 'Fundacja „Zapłon”';
export const DEFAULT_OG_IMAGE = { path: '/images/hero.jpg', width: 1200, height: 630 } as const;

export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-R3X89NGC74';
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

export const STALE_TIME = {
  settings: 5 * 60_000,
  content: 60_000,
} as const;

export const CONSENT_STORAGE_KEY = 'cookieConsent';
export const CONSENT_REOPEN_EVENT = 'zaplon:open-cookie-settings';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const MAX_IMAGE_SIZE_MB = 8;
export const MEDIA_BUCKET = 'media';

export const DOCUMENTS_BUCKET = 'documents';
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'text/plain',
] as const;
export const MAX_DOCUMENT_SIZE_MB = 20;

export const MIN_PASSWORD_LENGTH = 10;

export const SETTLEMENT_BUCKET = 'settlements';
