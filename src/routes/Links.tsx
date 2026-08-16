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
  FaXmark,
} from 'react-icons/fa6';
import { getSocialLinks, type SocialLinks } from '../lib/social';
import { getJoinLink, type JoinUs } from '../lib/join';
import Seo from '../components/Seo';
import Loader from '../components/Loader';
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
    (async () => {
      setLoading(true);
      const [social, join] = await Promise.all([getSocialLinks(), getJoinLink()]);
      setSocialLinks(social);
      setJoinLink(join);
      setLoading(false);
    })();
  }, []);

  // Blokowanie scrollowania pod modalem
  useEffect(() => {
    document.body.style.overflow = activeModal ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeModal]);

  if (loading) return <Loader />;

  const closeModal = () => {
    setActiveModal(null);
    if (DEEP_LINK_PATHS.includes(pathname)) {
      setLocation('/links');
    }
  };

  const links: LinkItem[] = [
    {
      title: 'Bezpłatne materiały',
      url: '/materialy',
      icon: <FaDownload className="text-2xl" />,
      description: 'Pobierz nasze poradniki',
    },
    {
      title: 'Wpłacam darowiznę',
      onClick: () => setActiveModal('donate'),
      icon: <FaHandHoldingHeart className="text-2xl" />,
      description: 'Wspieram wasze działania',
    },
    {
      title: 'Zapisuję się do\u00a0newslettera',
      onClick: () => setActiveModal('newsletter'),
      icon: <FaEnvelope className="text-2xl" />,
      description: 'Chcę być na bieżąco',
    },
    ...(joinLink?.survey_url
      ? [
          {
            title: 'Dołączam do\u00a0wolontariatu',
            url: joinLink.survey_url,
            icon: <FaUserPlus className="text-2xl" />,
            description: 'Jestem częścią zmiany',
          },
        ]
      : []),
    ...(socialLinks?.instagram
      ? [
          {
            title: 'Instagram',
            url: socialLinks.instagram,
            icon: <FaInstagram className="text-2xl" />,
            description: '@fundacjazaplon',
          },
        ]
      : []),
    ...(socialLinks?.linkedin
      ? [
          {
            title: 'LinkedIn',
            url: socialLinks.linkedin,
            icon: <FaLinkedin className="text-2xl" />,
            description: 'Obserwuj nas',
          },
        ]
      : []),
    {
      title: 'zaplon.org.pl',
      url: 'https://zaplon.org.pl',
      icon: <FaGlobe className="text-2xl" />,
      description: 'Nasza strona główna',
    },
  ];

  return (
    <>
      <Seo title='Linki | Fundacja „Zapłon”' description="Wszystkie ważne linki Fundacji „Zapłon” w jednym miejscu" />

      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-2 px-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Fundacja „Zapłon”</h1>
            <p className="text-text-black/70">Wspieramy aktywność społeczną i budujemy kapitał społeczny</p>
          </div>

          <div className="space-y-4">
            {links.map((link) => {
              const itemClasses =
                'block w-full text-left bg-base-200 hover:bg-brand hover:text-white border border-white/20 rounded-2xl p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg group cursor-pointer';

              const content = (
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 text-text-black group-hover:text-white transition-colors">
                    {link.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-text-black group-hover:text-white text-lg leading-tight transition-colors">
                      {link.title}
                    </div>
                    {link.description && (
                      <div className="text-sm text-text-black/70 group-hover:text-white/80 transition-colors mt-2">
                        {link.description}
                      </div>
                    )}
                  </div>
                </div>
              );

              if (link.onClick) {
                return (
                  <button key={link.title} type="button" onClick={link.onClick} className={itemClasses}>
                    {content}
                  </button>
                );
              }

              const isExternal = !!link.url && link.url.startsWith('http') && !link.url.includes('zaplon.org.pl');

              return (
                <a
                  key={link.title}
                  href={link.url}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  className={itemClasses}
                >
                  {content}
                </a>
              );
            })}
          </div>

          <div className="text-center mt-12 text-sm text-text-black/70">
            <p>© {new Date().getFullYear()} Fundacja „Zapłon”</p>
            <p className="mt-1">
              <a href="mailto:biuro@zaplon.org.pl" className="hover:underline">
                biuro@zaplon.org.pl
              </a>
            </p>
          </div>
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100]">
          <button
            type="button"
            aria-label="Zamknij"
            className="absolute inset-0 cursor-default"
            onClick={closeModal}
          />

          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button
              type="button"
              onClick={closeModal}
              aria-label="Zamknij okno"
              className="absolute top-4 right-4 z-10 p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              <FaXmark className="w-5 h-5" />
            </button>

            {activeModal === 'donate' && <DonateCard />}
            {activeModal === 'newsletter' && <NewsletterCard />}
          </div>
        </div>
      )}
    </>
  );
}