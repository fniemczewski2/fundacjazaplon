import { useEffect, useState, type ReactNode } from 'react';
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
} from 'react-icons/fa6';
import { getSocialLinks, type SocialLinks } from '../lib/social';
import { getJoinLink, type JoinUs } from '../lib/join';
import Seo from '../components/Seo';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import Reveal from '../components/Reveal';
import Illustration from '../components/Illustration';
import NewsletterCard from '../components/NewsletterCard';
import DonateCard from '../components/DonateCard';

type ModalKind = 'donate' | 'newsletter' | null;

type LinkItem = {
  title: string;
  description?: string;
  icon: ReactNode;
  url?: string;
  onClick?: () => void;
};

const DEEP_LINK_PATHS = ['/wplacam', '/newsletter', '/dolacz'];

export default function Links() {
  const [pathname, setLocation] = useLocation();

  const [socialLinks, setSocialLinks] = useState<SocialLinks | null>(null);
  const [joinLink, setJoinLink] = useState<JoinUs | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalKind>(null);

  useEffect(() => {
    if (pathname === '/wplacam') setActiveModal('donate');
    else if (pathname === '/newsletter') setActiveModal('newsletter');
  }, [pathname]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const [social, join] = await Promise.all([getSocialLinks(), getJoinLink()]);
      if (!alive) return;
      setSocialLinks(social);
      setJoinLink(join);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Blokadą przewijania i zwrotem fokusu zajmuje się teraz komponent Modal.
  const closeModal = () => {
    setActiveModal(null);
    if (DEEP_LINK_PATHS.includes(pathname)) setLocation('/links');
  };

  // Nagłówek renderujemy od razu. Wcześniej cała strona była zastąpiona
  // spinnerem do czasu odpowiedzi Supabase, więc przy wolnym łączu
  // użytkownik przez chwilę nie widział nawet nazwy fundacji.
  const links: LinkItem[] = [
    {
      title: 'Bezpłatne materiały',
      url: '/materialy',
      icon: <FaDownload aria-hidden="true" className="text-xl" />,
      description: 'Poradniki do pobrania',
    },
    {
      title: 'Wpłacam darowiznę',
      onClick: () => setActiveModal('donate'),
      icon: <FaHandHoldingHeart aria-hidden="true" className="text-xl" />,
      description: 'Wspieram wasze działania',
    },
    {
      title: 'Zapisuję się do\u00a0newslettera',
      onClick: () => setActiveModal('newsletter'),
      icon: <FaEnvelope aria-hidden="true" className="text-xl" />,
      description: 'Chcę być na bieżąco',
    },
    ...(joinLink?.survey_url
      ? [
          {
            title: 'Dołączam do\u00a0wolontariatu',
            url: joinLink.survey_url,
            icon: <FaUserPlus aria-hidden="true" className="text-xl" />,
            description: 'Jestem częścią zmiany',
          },
        ]
      : []),
    ...(socialLinks?.instagram
      ? [
          {
            title: 'Instagram',
            url: socialLinks.instagram,
            icon: <FaInstagram aria-hidden="true" className="text-xl" />,
            description: '@fundacjazaplon',
          },
        ]
      : []),
    ...(socialLinks?.linkedin
      ? [
          {
            title: 'LinkedIn',
            url: socialLinks.linkedin,
            icon: <FaLinkedin aria-hidden="true" className="text-xl" />,
            description: 'Obserwuj nas',
          },
        ]
      : []),
    {
      title: 'zaplon.org.pl',
      url: 'https://zaplon.org.pl',
      icon: <FaGlobe aria-hidden="true" className="text-xl" />,
      description: 'Nasza strona główna',
    },
  ];

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
              <Reveal as="li" key={link.title} delay={i * 70}>
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
                    {isExternal && <span className="sr-only">— otwiera się w nowej karcie</span>}
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
