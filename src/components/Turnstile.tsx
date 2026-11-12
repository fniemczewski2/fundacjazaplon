import { useEffect, useRef } from 'react';
import { TURNSTILE_SITE_KEY } from '../lib/config';
import { logger } from '../lib/logger';

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
      theme: 'auto';
      language: 'pl';
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

type TurnstileWindow = Window & { turnstile?: TurnstileApi };

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  const w = window as TurnstileWindow;
  if (w.turnstile) return Promise.resolve(w.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (w.turnstile ? resolve(w.turnstile) : reject(new Error('Turnstile niedostępny')));
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Nie udało się wczytać Turnstile'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

type Props = {
  onToken: (token: string | null) => void;
  /** Zmiana wartości odświeża widżet (token działa tylko raz, więc po każdej próbie wysyłki trzeba go zresetować). */
  resetKey?: number;
};

/** Widżet Cloudflare Turnstile. Bez klucza witryny (VITE_TURNSTILE_SITE_KEY) niczego nie renderuje. */
export default function Turnstile({ onToken, resetKey = 0 }: Readonly<Props>) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !container.current) return;
    const el = container.current;
    let cancelled = false;

    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widgetId.current = api.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
          theme: 'auto',
          language: 'pl',
        });
      })
      .catch((error: unknown) => logger.warn('Turnstile', error));

    return () => {
      cancelled = true;
      const api = (window as TurnstileWindow).turnstile;
      if (api && widgetId.current) api.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey === 0) return;
    const api = (window as TurnstileWindow).turnstile;
    if (api && widgetId.current) api.reset(widgetId.current);
    onTokenRef.current(null);
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={container} className="min-h-[65px]" />;
}
