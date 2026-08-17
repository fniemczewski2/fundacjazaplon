import { Link } from 'wouter';
import { FaInstagram, FaFacebook, FaXTwitter, FaLinkedin } from 'react-icons/fa6';
import type { IconType } from 'react-icons';
import { useContactInfo, useSocialLinks } from '../hooks/useAppData';
import PrivacyPolicyLink from './PrivacyPolicyLink';
import Illustration from './Illustration';
import type { SocialLinks } from '../lib/social';

const FALLBACK_EMAIL = 'biuro@zaplon.org.pl';
const FALLBACK_ADDRESS = 'Baranówko 19B, 62-050 Mosina';

const SOCIAL_ITEMS: ReadonlyArray<{
  key: keyof Omit<SocialLinks, 'id'>;
  label: string;
  Icon: IconType;
}> = [
  { key: 'facebook', label: 'Facebook', Icon: FaFacebook },
  { key: 'instagram', label: 'Instagram', Icon: FaInstagram },
  { key: 'linkedin', label: 'LinkedIn', Icon: FaLinkedin },
  { key: 'twitter', label: 'X / Twitter', Icon: FaXTwitter },
];

const SITE_LINKS = [
  { to: '/o-nas', label: 'O nas' },
  { to: '/zespol', label: 'Zespół' },
  { to: '/aktualnosci', label: 'Aktualności' },
  { to: '/materialy', label: 'Materiały' },
  { to: '/dokumenty', label: 'Dokumenty' },
  { to: '/kontakt', label: 'Kontakt' },
];

export default function Footer() {
  const { data: links } = useSocialLinks();
  const { data: contact } = useContactInfo();

  const email = contact?.email ?? FALLBACK_EMAIL;
  const address = contact?.address ?? FALLBACK_ADDRESS;
  const account = contact?.account_number?.trim();

  return (
    <footer className="panel-brand on-brand relative mt-auto overflow-hidden">
      {/* Ognisko wtopione w róg stopki — domyka narrację ognia z góry strony. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -bottom-10 w-56 opacity-15 md:w-72"
      >
        <Illustration name="ognisko" />
      </div>

      <div className="relative container-max py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <img
              src="/images/logo.svg"
              alt="Fundacja Zapłon"
              width={104}
              height={64}
              className="mb-4 h-16 w-auto"
            />
            <p className="max-w-xs text-sm text-white/80">
              Wspieramy osoby, które działają społecznie — żeby zapał nie kończył się na
              pierwszym projekcie.
            </p>
          </div>

          <nav aria-labelledby="footer-nav">
            <h2 id="footer-nav" className="mb-4 text-sm font-semibold tracking-wide uppercase">
              Na stronie
            </h2>
            <ul className="space-y-2.5 text-sm">
              {SITE_LINKS.map((item) => (
                <li key={item.to}>
                  <Link
                    href={item.to}
                    className="text-white/80 underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className="mb-4 text-sm font-semibold tracking-wide uppercase">
              Kontakt
            </h2>
            <address className="space-y-2.5 text-sm text-white/80 not-italic">
              <p>
                <a
                  href={`mailto:${email}`}
                  className="underline underline-offset-4 transition-colors hover:text-white"
                >
                  {email}
                </a>
              </p>
              <p>{address}</p>
              {account && (
                <p className="pt-1">
                  <span className="block text-xs tracking-wide text-white/60 uppercase">
                    Numer konta
                  </span>
                  <span className="font-mono text-[0.8rem] break-all">{account}</span>
                </p>
              )}
            </address>
          </section>

          <section aria-labelledby="footer-social">
            <h2 id="footer-social" className="mb-4 text-sm font-semibold tracking-wide uppercase">
              Śledź nas
            </h2>
            <ul className="flex flex-wrap gap-2">
              {SOCIAL_ITEMS.map(({ key, label, Icon }) => {
                const href = links?.[key];
                if (!href) return null;

                return (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-11 items-center justify-center rounded-full border border-white/25 text-lg transition hover:border-white hover:bg-white hover:text-brand"
                    >
                      <Icon aria-hidden="true" />
                      <span className="sr-only">{label} — otwiera się w nowej karcie</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Fundacja „Zapłon”. Wszelkie prawa zastrzeżone.</p>
          <PrivacyPolicyLink />
        </div>
      </div>
    </footer>
  );
}
