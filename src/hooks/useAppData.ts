import { useQuery } from '@tanstack/react-query';
import { getJoinLink } from '../lib/join';
import { getSocialLinks } from '../lib/social';
import { getContact } from '../lib/contact';
import { getAbout, getPillars } from '../lib/about';
import { ALL_CATEGORIES, listDocuments } from '../lib/documents';
import { listMaterials } from '../lib/materials';
import { getPostBySlug, listPublishedPosts } from '../lib/post';
import { listTeamPublic } from '../lib/team';
import { STALE_TIME } from '../lib/config';

export function useJoinLink() {
  return useQuery({ queryKey: ['join-link'], queryFn: getJoinLink, staleTime: STALE_TIME.settings });
}

export function useSocialLinks() {
  return useQuery({ queryKey: ['social-links'], queryFn: getSocialLinks, staleTime: STALE_TIME.settings });
}

export function useContactInfo() {
  return useQuery({ queryKey: ['contact-info'], queryFn: getContact, staleTime: STALE_TIME.settings });
}

export function usePublishedPosts() {
  return useQuery({ queryKey: ['posts', 'published'], queryFn: listPublishedPosts, staleTime: STALE_TIME.content });
}

/** `data === null` oznacza, że wpisu nie ma (albo nie jest jeszcze opublikowany). */
export function usePost(slug: string | undefined) {
  return useQuery({
    queryKey: ['posts', 'slug', slug],
    queryFn: () => getPostBySlug(slug as string),
    enabled: Boolean(slug),
    staleTime: STALE_TIME.content,
  });
}

export function useTeam() {
  // Musi być `listTeamPublic` (filtruje active=true): wersja panelowa pokazywałaby też osoby nieaktywne z ich danymi kontaktowymi.
  return useQuery({ queryKey: ['team', 'public'], queryFn: listTeamPublic, staleTime: STALE_TIME.settings });
}

export function useAbout() {
  return useQuery({
    queryKey: ['about'],
    queryFn: async () => {
      const [about, pillars] = await Promise.all([getAbout(), getPillars()]);
      return { about, pillars };
    },
    staleTime: STALE_TIME.settings,
  });
}

export function useDocumentGroups() {
  return useQuery({
    queryKey: ['documents', 'groups'],
    queryFn: () =>
      Promise.all(
        ALL_CATEGORIES.map(async (category) => ({
          key: category.key,
          label: category.label,
          items: (await listDocuments(category.key)).map((item) => ({ name: item.name, url: item.url })),
        })),
      ),
    staleTime: STALE_TIME.settings,
  });
}

export function useMaterials() {
  return useQuery({ queryKey: ['materials'], queryFn: listMaterials, staleTime: STALE_TIME.content });
}

/** Adres PDF z polityką prywatności z panelu (jeśli wgrany). Brak pliku to `null`, nie błąd. */
export function usePrivacyPolicyDocUrl() {
  return useQuery({
    queryKey: ['documents', 'privacy-policy'],
    queryFn: async () => {
      const items = await listDocuments('polityka-prywatnosci');
      return items.find((doc) => doc.name.toLowerCase().includes('polityka'))?.url ?? null;
    },
    staleTime: STALE_TIME.settings,
  });
}
