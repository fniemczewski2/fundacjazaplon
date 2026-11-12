import { CONSENT_REOPEN_EVENT, CONSENT_STORAGE_KEY, GA_MEASUREMENT_ID } from './config';

export type ConsentValue = 'accepted' | 'rejected';

export type AnalyticsEvent = 'donate_start' | 'newsletter_signup' | 'material_download' | 'settlement_submit';

type Gtag = (...args: unknown[]) => void;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag };

let loaded = false;

// Linki do dokumentów (/umowa/<token>) zawierają osobisty token dostępu: do analityki idzie sama ścieżka.
const sanitizePath = (path: string) => path.replace(/^\/umowa\/[^/]+/, '/umowa');

export function readConsent(): ConsentValue | null {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === 'accepted' || value === 'rejected' ? value : null;
  } catch {
    return null;
  }
}

/** Wczytuje gtag.js dopiero po zgodzie. Bez zgody żadne żądanie do Google nie jest wysyłane. */
function load() {
  if (loaded || !GA_MEASUREMENT_ID) return;
  loaded = true;

  const w = window as AnalyticsWindow;
  w.dataLayer = w.dataLayer ?? [];
  w.gtag = function gtag(...args: unknown[]) {
    w.dataLayer?.push(args);
  };
  w.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  w.gtag('js', new Date());
  w.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

export function setConsent(value: ConsentValue) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // Brak dostępu do localStorage: wybór obowiązuje do końca sesji karty.
  }
  applyConsent(value);
}

/** Stosuje zapisany wybór. Odmowa po wcześniejszej zgodzie wyłącza zbieranie danych od razu. */
export function applyConsent(value: ConsentValue | null) {
  const w = window as AnalyticsWindow;
  if (value === 'accepted') {
    load();
    w.gtag?.('consent', 'update', { analytics_storage: 'granted' });
  } else if (loaded) {
    w.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  }
}

export function trackPageView(path: string) {
  const w = window as AnalyticsWindow;
  if (!loaded || typeof w.gtag !== 'function') return;
  const clean = sanitizePath(path);
  w.gtag('event', 'page_view', {
    page_path: clean,
    page_location: `${globalThis.location.origin}${clean}`,
    page_title: document.title,
  });
}

export function trackEvent(name: AnalyticsEvent, params?: Record<string, unknown>) {
  const w = window as AnalyticsWindow;
  if (!loaded || typeof w.gtag !== 'function') return;
  w.gtag('event', name, params);
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT));
}
