import { useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  FaInstagram,
  FaLinkedin,
  FaGlobe,
  FaHandHoldingHeart,
  FaUserPlus,
  FaEnvelope,
  FaDownload,
  FaArrowRight,
  FaLink,
} from 'react-icons/fa6';
import { useJoinLink, useLinkItems, useSocialLinks } from '../hooks/useAppData';
import type { LinkIcon } from '../../shared/links';
import Seo from '../components/Seo';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import Reveal from '../components/Reveal';
import Illustration from '../components/Illustration';
import NewsletterCard from '../components/NewsletterCard';
import DonateCard from '../components/DonateCard';
import { FaClipboard } from 'react-icons/fa';

type ModalKind = 'donate' | 'newsletter' | null;

type LinkItem = {
  id: string;
  title: string;
  description?: string;
  icon: ReactNode;
  url?: string;
  onClick?: () => void;
};

const ICON_CLASS = 'text-xl';

const ICONS: Record<LinkIcon, ReactNode> = {
  link: <FaLink aria-hidden="true" className={ICON_CLASS} />,
  clipboard: <FaClipboard aria-hidden="true" className={ICON_CLASS} />,
  download: <FaDownload aria-hidden="true" className={ICON_CLASS} />,
  globe: <FaGlobe aria-hidden="true" className={ICON_CLASS} />,
  envelope: <FaEnvelope aria-hidden="true" className={ICON_CLASS} />,
  heart: <FaHandHoldingHeart aria-hidden="true" className={ICON_CLASS} />,
  'user-plus': <FaUserPlus aria-hidden="true" className={ICON_CLASS} />,
  instagram: <FaInstagram aria-hidden="true" className={ICON_CLASS} />,
  linkedin: <FaLinkedin aria-hidden="true" className={ICON_CLASS} />,
};

const DEEP_LINK_PATHS = new Set(['/wplacam', '/newsletter', '/dolacz']);

export default function Links() {
  const [pathname, setLocation] = useLocation();

  const { data: socialLinks, isPending: socialPending } = useSocialLinks();
  const { data: joinLink, isPending: joinPending } = useJoinLink();
  const { data: items, isPending: itemsPending } = useLinkItems();
  const loading = socialPending || joinPending || itemsPending;

  // Okno otwarte kliknięciem ma pierwszeństwo; linki /wplacam i /newsletter otwierają je od razu po wejściu.
  const [openedModal, setOpenedModal] = useState<ModalKind>(null);
  const deepLinkModal: ModalKind = pathname === '/wplacam' ? 'donate' : pathname === '/newsletter' ? 'newsletter' : null;
  const activeModal = openedModal ?? deepLinkModal;

  const closeModal = () => {
    setOpenedModal(null);
    if (DEEP_LINK_PATHS.has(pathname)) setLocation('/links');
  };

  const links = (items ?? []).flatMap((item): LinkItem[] => {
    if (!item.active) return [];
    const base = { id: item.id, title: item.title, description: item.description ?? undefined, icon: ICONS[item.icon] };
    switch (item.kind) {
      case 'donate':
        return [{ ...base, onClick: () => setOpenedModal('donate') }];
      case 'newsletter':
        return [{ ...base, onClick: () => setOpenedModal('newsletter') }];
      case 'join':
        return joinLink?.survey_url ? [{ ...base, url: joinLink.survey_url }] : [];
      case 'instagram':
        return socialLinks?.instagram ? [{ ...base, url: socialLinks.instagram }] : [];
      case 'linkedin':
        return socialLinks?.linkedin ? [{ ...base, url: socialLinks.linkedin }] : [];
      default:
        return item.url ? [{ ...base, url: item.url }] : [];
    }
  });

  const itemClasses =
    'card card-interactive flex w-full items-center gap-4 p-5 text-left no-underline';

  return (
    <>
      <Seo
        title="Linki | Fundacja „Zapłon”"
        description="Wszystkie ważne linki Fundacji „Zapłon” w jednym miejscu."
      />

      <div className="container-prose py-14">
        <Reveal className="text-center">
          <div aria-hidden="true" className="mx-auto mb-6 w-20">
            <Illustration name="plomyk" priority glow />
          </div>
          <h1 className="section-title">Fundacja „Zapłon”</h1>
          <p className="lead mt-3">Wspieramy aktywność społeczną i budujemy kapitał społeczny.</p>
        </Reveal>

        {loading && <Loader />}

        <ul className="mt-10 space-y-4">
          {links.map((link, i) => {
            const content = (
              <>
                <span className="grid size-12 shrink-0 place-items-center rounded-full panel-cool text-ember-ink">
                  {link.icon}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-lg leading-tight font-semibold">
                    {link.title}
                  </span>
                  {link.description && (
                    <span className="muted mt-1 block text-sm">{link.description}</span>
                  )}
                </span>

                <FaArrowRight aria-hidden="true" className="muted shrink-0" />
              </>
            );

            const isExternal =
              !!link.url && link.url.startsWith('http') && !link.url.includes('zaplon.org.pl');

            return (
              <Reveal as="li" key={link.id} delay={i * 70}>
                {link.onClick ? (
                  <button type="button" onClick={link.onClick} className={itemClasses}>
                    {content}
                  </button>
                ) : (
                  <a
                    href={link.url}
                    target={isExternal ? '_blank' : undefined}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                    className={itemClasses}
                  >
                    {content}
                    {isExternal && <span className="sr-only">- otwiera się w nowej karcie</span>}
                  </a>
                )}
              </Reveal>
            );
          })}
        </ul>

        <p className="muted mt-12 text-center text-sm">
          © {new Date().getFullYear()} Fundacja „Zapłon” ·{' '}
          <a href="mailto:biuro@zaplon.org.pl" className="link-quiet">
            biuro@zaplon.org.pl
          </a>
        </p>
      </div>

      <Modal
        open={activeModal === 'donate'}
        onClose={closeModal}
        title="Wspieram Fundację „Zapłon”"
        hideTitle
        size="lg"
      >
        <DonateCard />
      </Modal>

      <Modal
        open={activeModal === 'newsletter'}
        onClose={closeModal}
        title="Newsletter Fundacji „Zapłon”"
        hideTitle
        size="lg"
      >
        <NewsletterCard />
      </Modal>
    </>
  );
}
