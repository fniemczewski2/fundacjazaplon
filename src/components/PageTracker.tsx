import { useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import ReactGA from 'react-ga4';

const PageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    // Wysyłaj pageview tylko wtedy, gdy użytkownik zaakceptował ciasteczka
    const consent = localStorage.getItem('cookieConsent');
    
    if (consent === 'accepted') {
      ReactGA.send({ 
        hitType: 'pageview', 
        page: location.pathname + location.search,
        title: document.title 
      });
    }
  }, [location]);

  // Outlet renderuje wszystkie ścieżki (children), które są zagnieżdżone w tym komponencie
  return <Outlet />;
};

export default PageTracker;