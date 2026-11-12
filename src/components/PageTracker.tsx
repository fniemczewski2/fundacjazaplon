import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { trackPageView } from '../lib/analytics';

/** Jedno zdarzenie page_view na każde wejście na trasę (bez zgody trackPageView nic nie wysyła). */
export default function PageTracker({ children }: Readonly<{ children: React.ReactNode }>) {
  const [location] = useLocation();

  useEffect(() => {
    trackPageView(location);
  }, [location]);

  return <>{children}</>;
}
