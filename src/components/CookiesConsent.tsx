// src/components/CookiesConsent.tsx
import { useState, useEffect } from 'react';
import PrivacyPolicyLink from './PrivacyPolicyLink';

type ConsentValue = 'accepted' | 'rejected';

function updateAnalyticsConsent(granted: boolean) {
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
    });
  }
}

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent') as ConsentValue | null;
    if (!consent) {
      setIsVisible(true);
    } else {
      // Niezależnie od wcześniejszego wyboru, odtwarzamy go po każdym wejściu —
      // domyślny stan z index.html to zawsze "denied", więc bez tego kroku
      // wcześniej zaakceptowana zgoda "gubiłaby się" przy każdym odświeżeniu.
      updateAnalyticsConsent(consent === 'accepted');
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted' satisfies ConsentValue);
    setIsVisible(false);
    updateAnalyticsConsent(true);
  };

  const handleReject = () => {
    localStorage.setItem('cookieConsent', 'rejected' satisfies ConsentValue);
    setIsVisible(false);
    // Wcześniej odrzucenie zgody tylko chowało baner, nic nie cofając — GA
    // i tak już zaczynał śledzić dzięki bezwarunkowemu gtag.js. Teraz jawnie
    // potwierdzamy odmowę w Consent Mode (choć domyślny stan i tak jest "denied").
    updateAnalyticsConsent(false);
  };

  if (!isVisible) return null;

  return (
    // `role="region"` + etykieta sprawiają, że baner jest wykrywalny jako
    // osobny obszar strony. Wcześniej był anonimowym `div`-em na końcu DOM.
    <div
      role="region"
      aria-label="Zgoda na pliki cookie"
      className="fixed bottom-0 left-0 z-[9999] flex w-full flex-col items-center justify-between gap-4 border-t bg-surface-raised px-6 py-4 font-sans text-ink shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.35)] md:flex-row"
    >
      <div className="max-w-3xl text-center text-sm md:text-left">
        <p className="m-0 leading-relaxed">
          <strong>Szanujemy Twoją prywatność.</strong> Nasza strona używa plików
          cookie (ciasteczek) w celach statystycznych (Google Analytics) oraz do
          prawidłowego działania serwisu. Zgodnie z polskim prawem i RODO, prosimy
          o Twoją zgodę. Możesz zarządzać swoimi preferencjami lub dowiedzieć się
          więcej w naszej{' '}
          <PrivacyPolicyLink black />.
        </p>
      </div>
      <div className="flex gap-3 shrink-0">
        <button onClick={handleAccept} className="btn btn-primary inline-flex">
          Akceptuję
        </button>
        <button onClick={handleReject} className="btn btn-secondary inline-flex">
          Odrzucam
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
