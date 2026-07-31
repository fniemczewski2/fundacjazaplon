import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Przewija do elementu wskazanego przez `#hash` w adresie URL, gdy tylko dane
 * strony są gotowe (`ready === true`). Konieczne w tym SPA, bo w przeciwieństwie
 * do wielostronicowej witryny, element o danym `id` może fizycznie nie istnieć
 * w DOM w momencie, w którym przeglądarka próbuje przewinąć do niego natywnie
 * (np. po pełnym przeładowaniu strony z innej trasy niż "/").
 *
 * Wcześniej ten wzorzec był zaimplementowany ad-hoc tylko w `Team.tsx` — kotwica
 * `#donate` używana przez `Navbar`/`Hero` z innych podstron nie działała wcale.
 */
export function useScrollToHash(ready: boolean) {
  const location = useLocation();

  useEffect(() => {
    if (!ready || !location.hash) return;

    const id = location.hash.slice(1);
    const element = document.getElementById(id);
    if (!element) return;

    const timeoutId = setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [ready, location]);
}
