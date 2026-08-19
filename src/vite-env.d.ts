/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Typy dla gtag.js / Google Consent Mode, wstrzykiwanego w index.html poza React.
type GtagConsentParams = Partial<{
  analytics_storage: 'granted' | 'denied';
  ad_storage: 'granted' | 'denied';
  ad_user_data: 'granted' | 'denied';
  ad_personalization: 'granted' | 'denied';
}>;

type GtagFn = {
  (command: 'js', date: Date): void;
  (command: 'config', targetId: string, config?: Record<string, unknown>): void;
  (command: 'consent', action: 'default' | 'update', params: GtagConsentParams): void;
  (command: 'event', eventName: string, params?: Record<string, unknown>): void;
};

interface Window {
  dataLayer: unknown[];
  gtag: GtagFn;
}

declare var dataLayer: unknown[];
declare var gtag: GtagFn;
