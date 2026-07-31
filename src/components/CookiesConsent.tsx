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
    <div className="fixed bottom-0 left-0 w-full bg-base-100 text-text-black px-6 py-4 flex flex-col md:flex-row items-center justify-between z-[9999] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] font-sans">
      <div className="mb-4 md:mb-0 text-center md:text-left text-sm max-w-3xl">
        <p className="m-0 leading-relaxed">
          <strong>Szanujemy Twoją prywatność.</strong> Nasza strona używa plików
          cookie (ciasteczek) w celach statystycznych (Google Analytics) oraz do
          prawidłowego działania serwisu. Zgodnie z polskim prawem i RODO, prosimy
          o Twoją zgodę. Możesz zarządzać swoimi preferencjami lub dowiedzieć się
          więcej w naszej{' '}
          <PrivacyPolicyLink />.
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
