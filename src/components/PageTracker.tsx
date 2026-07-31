import { useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';

const GA_MEASUREMENT_ID = 'G-R3X89NGC74';

const PageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // gtag.js (index.html) śledzi automatycznie tylko PIERWSZE wejście na stronę —
    // kolejne, klienckie zmiany trasy w tym SPA trzeba zgłaszać ręcznie. Google
    // Consent Mode (ustawiony w index.html + CookiesConsent.tsx) i tak decyduje,
    // czy dane faktycznie zostaną wysłane, więc nie musimy tu duplikować
    // sprawdzania zgody — to jedyne, spójne miejsce integracji z GA.
    if (typeof window.gtag === 'function') {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location]);

  // Outlet renderuje wszystkie ścieżki (children), które są zagnieżdżone w tym komponencie
  return <Outlet />;
};

export default PageTracker;
