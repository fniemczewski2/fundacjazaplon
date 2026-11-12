// Jedno miejsce na limity, czasy życia i stałe konfiguracyjne funkcji serwerowych.

export const siteUrl = (): string => (process.env.PUBLIC_SITE_URL || 'https://zaplon.org.pl').replace(/\/+$/, '');

export const DAY_MS = 86_400_000;

// --- umowy i podpis ---
export const OTP_TTL_MS = 10 * 60_000;
export const OTP_COOLDOWN_MS = 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const INVITE_DAYS = 14;
export const FINAL_LINK_DAYS = 30;
export const NOTE_MAX = 1000;

// --- darowizny ---
export const DONATION_MIN_PLN = 1;
export const DONATION_MAX_PLN = 50_000;

// --- rozliczenia faktur ---
export const SETTLEMENT_BUCKET = 'settlements';
export const SETTLEMENT_TICKET_TTL_MS = 30 * 60_000;

// --- formularze publiczne ---
export const CONTACT_MESSAGE_MAX = 5000;
export const FIELD_NAME_MAX = 200;
export const FILE_URL_MAX = 500;
export const FILE_TITLE_MAX = 200;

// --- limity żądań: liczba prób w oknie czasowym, osobno dla adresu IP ---
export const RATE_LIMITS = {
  newsletter: { limit: 5, windowSec: 3600 },
  donation: { limit: 10, windowSec: 3600 },
  contact: { limit: 5, windowSec: 3600 },
  agreementSubmit: { limit: 5, windowSec: 3600 },
  agreementAccess: { limit: 120, windowSec: 600 },
  agreementSign: { limit: 30, windowSec: 600 },
  settlementPrepare: { limit: 10, windowSec: 3600 },
  settlementCommit: { limit: 10, windowSec: 3600 },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

// Strony publiczne ujęte w sitemap.xml (wpisy dodaje api/sitemap.ts z bazy).
export const SITEMAP_PATHS = ['/', '/aktualnosci', '/o-nas', '/zespol', '/dokumenty', '/materialy', '/kontakt', '/wspolpraca', '/linki'] as const;
