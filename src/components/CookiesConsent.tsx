import React, { useState, useEffect } from 'react';
import ReactGA from 'react-ga4';

// TODO: Replace with your actual Google Analytics Measurement ID
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID; 

const CookieConsent = () => {
const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    
    if (!consent) {
      setIsVisible(true);
    } else if (consent === 'accepted') {
      // Jeśli użytkownik już wcześniej się zgodził, aktualizujemy status na 'granted'
      grantConsent();
    }
  }, []);

  // Funkcja zmieniająca stan na ZGODĘ
  const grantConsent = () => {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted',
        'ad_storage': 'granted',
        'ad_user_data': 'granted',
        'ad_personalization': 'granted'
      });
    }
  };

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
    grantConsent();
  };

  const handleReject = () => {
    localStorage.setItem('cookieConsent', 'rejected');
    setIsVisible(false);
    // Nie musimy wysyłać 'denied', bo ustawiliśmy to jako domyślne w index.html
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-base-100 text-text-black px-6 py-4 flex flex-col md:flex-row items-center justify-between z-[9999] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] font-sans">
      <div className="mb-4 md:mb-0 text-center md:text-left text-sm max-w-3xl">
        <p className="m-0 leading-relaxed">
          <strong>Szanujemy Twoją prywatność.</strong> Nasza strona używa plików cookie 
          (ciasteczek) w celach statystycznych (Google Analytics) oraz do prawidłowego 
          działania serwisu. Zgodnie z polskim prawem i RODO, prosimy o Twoją zgodę. 
          Możesz zarządzać swoimi preferencjami lub dowiedzieć się więcej w naszej Polityce Prywatności.
        </p>
      </div>
      <div className="flex gap-3 shrink-0">
        <button 
          onClick={handleAccept} 
          className="btn btn-primary inline-flex"
        >
          Akceptuję
        </button>
        <button 
          onClick={handleReject} 
          className="btn btn-secondary inline-flex"
        >
          Odrzucam
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;