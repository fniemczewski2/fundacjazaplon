import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function useScrollToHash(ready: boolean) {
  const [pathname] = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (!ready || !hash) return;

    const id = hash.slice(1);
    const element = document.getElementById(id);
    if (!element) return;

    const timeoutId = setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [ready, pathname]); 
}