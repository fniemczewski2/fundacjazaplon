import { useQuery } from '@tanstack/react-query';
import { getJoinLink } from '../lib/join';
import { getSocialLinks } from '../lib/social';
import { getContact } from '../lib/contact';

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
