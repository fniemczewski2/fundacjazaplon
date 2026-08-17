import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Zwraca `true`, gdy użytkownik poprosił system o ograniczenie animacji.
 *
 * Wartość startowa jest czytana synchronicznie, więc komponenty nie mrugają
 * pojedynczą klatką animacji przed pierwszym efektem. Nasłuchujemy też zmian
 * w trakcie sesji - ustawienie da się przełączyć bez przeładowania strony.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);

    setReduced(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
