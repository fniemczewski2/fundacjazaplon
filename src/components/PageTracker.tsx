import { useEffect } from 'react';
import { useLocation } from 'wouter';

// Linki do dokumentów (/umowa/<token>) zawierają osobisty token dostępu - do analityki idzie sama ścieżka.
const sanitize = (path: string) => path.replace(/^\/umowa\/[^/]+/, '/umowa');

export default function PageTracker({ children }: Readonly<{ children: React.ReactNode }>) {
  const [location] = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;
    const path = sanitize(location);
    // Jedno zdarzenie page_view na każde wejście na trasę. Wywołanie `config` w index.html ma wyłączone
    // automatyczne page_view, bo wysyłałoby pełny adres razem z tokenem.
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: `${globalThis.location.origin}${path}`,
      page_title: document.title,
    });
  }, [location]);

  return <>{children}</>;
}
