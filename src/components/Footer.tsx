import { useContactInfo, useSocialLinks } from '../hooks/useAppData';
import { FaInstagram, FaFacebook, FaXTwitter, FaLinkedin } from 'react-icons/fa6';
import type { IconType } from 'react-icons';
import PrivacyPolicyLink from './PrivacyPolicyLink';
import type { SocialLinks } from '../lib/social';

const FALLBACK_EMAIL = 'biuro@zaplon.org.pl';
const FALLBACK_ADDRESS = 'Baranówko 19B, 62-050 Mosina';

const SOCIAL_ITEMS: ReadonlyArray<{ key: keyof Omit<SocialLinks, 'id'>; label: string; Icon: IconType }> = [
  { key: 'facebook', label: 'Facebook', Icon: FaFacebook },
  { key: 'instagram', label: 'Instagram', Icon: FaInstagram },
  { key: 'linkedin', label: 'LinkedIn', Icon: FaLinkedin },
  { key: 'twitter', label: 'X / Twitter', Icon: FaXTwitter },
];

export default function Footer() {
  const { data: links } = useSocialLinks();
  const { data: contact } = useContactInfo();

  const email = contact?.email ?? FALLBACK_EMAIL;
  const address = contact?.address ?? FALLBACK_ADDRESS;

  return (
    <footer className="bg-brand border-t border-white/10">
      <div className="container-max py-10 grid md:grid-cols-3 gap-8 text-sm text-white">
        <div>
          <img src="/images/logo.svg" alt="Logo Fundacji Zapłon" width="104" height="64" className="h-16 w-auto mb-3 logo" />
          <p>© {new Date().getFullYear()} Fundacja „Zapłon”. Wszelkie prawa zastrzeżone.</p>
        </div>
        <div>
          <p className="font-semibold mb-2">Kontakt</p>
          <p><a href={`mailto:${email}`} className="underline">{email}</a></p>
          <p>{address}</p>
          <p className="mt-2"><PrivacyPolicyLink /></p>
        </div>
        <div>
          <p className="font-semibold mb-2">Śledź nas</p>
          <ul className="flex gap-2 flex-col">
            {SOCIAL_ITEMS.map(({ key, label, Icon }) => {
              const href = links?.[key];
              if (!href) return null;

              return (
                <li key={key}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="hover:underline text-lg transition-colors flex flex-nowrap items-center gap-1"
                  >
                    <Icon aria-hidden="true" />
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </footer>
  );
}