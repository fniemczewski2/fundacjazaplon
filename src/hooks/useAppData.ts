import { useQuery } from '@tanstack/react-query';
import { getJoinLink } from '../lib/join';
import { getSocialLinks } from '../lib/social';
import { getContact } from '../lib/contact';

/**
 * Współdzielone hooki danych "singletonowych" (rzadko zmieniające się
 * konfiguracje: link do ankiety wolontariatu, linki social media, dane
 * kontaktowe/do przelewu). Bez tego każdy komponent robił własny
 * `useEffect + useState + fetch` — np. `getJoinLink()` było wywoływane
 * niezależnie i tak samo w Navbar i w JoinUsCard przy każdym wejściu na "/".
 *
 * React Query automatycznie:
 * - deduplikuje równoległe zapytania o ten sam `queryKey` (Navbar i JoinUsCard
 *   montujące się w tym samym momencie wykonają JEDNO zapytanie sieciowe),
 * - cache'uje wynik między komponentami i nawigacjami,
 * - w tle rewaliduje dane po upływie `staleTime`, bez migotania UI.
 */

const FIVE_MINUTES = 5 * 60 * 1000;

export function useJoinLink() {
  return useQuery({
    queryKey: ['join-link'],
    queryFn: getJoinLink,
    staleTime: FIVE_MINUTES,
  });
}

export function useSocialLinks() {
  return useQuery({
    queryKey: ['social-links'],
    queryFn: getSocialLinks,
    staleTime: FIVE_MINUTES,
  });
}

export function useContactInfo() {
  return useQuery({
    queryKey: ['contact-info'],
    queryFn: getContact,
    staleTime: FIVE_MINUTES,
  });
}
