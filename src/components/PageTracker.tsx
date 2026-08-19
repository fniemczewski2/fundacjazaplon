import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function PageTracker({ children }: Readonly<{ children: React.ReactNode }>) {
  const [location] = useLocation(); // <--- Zwraca string (ścieżkę)

  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'G-R3X89NGC74', {
        page_path: location,
      });
    }
  }, [location]);

  return <>{children}</>;
}