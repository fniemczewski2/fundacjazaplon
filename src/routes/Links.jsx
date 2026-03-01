// src/routes/Links.jsx
import { useEffect, useState } from 'react';
import { FaInstagram, FaLinkedin, FaGlobe, FaHandHoldingHeart, FaUserPlus, FaEnvelope } from 'react-icons/fa6';
import { FaXmark } from 'react-icons/fa6'; // Do zamykania modala
import { getSocialLinks } from '../lib/social';
import { getJoinLink } from '../lib/join';
import Seo from '../components/Seo';
import Loader from '../components/Loader';
// Zaimportuj swoje komponenty - upewnij się, że ścieżki są poprawne!
import NewsletterCard from '../components/NewsletterCard'; 
import DonateCard from '../components/DonateCard'; 

export default function Links() {
  const [socialLinks, setSocialLinks] = useState(null);
  const [joinLink, setJoinLink] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Stany dla modali
  const [activeModal, setActiveModal] = useState(null); // 'donate', 'newsletter' lub null

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [social, join] = await Promise.all([
        getSocialLinks(),
        getJoinLink()
      ]);
      setSocialLinks(social);
      setJoinLink(join);
      setLoading(false);
    })();
  }, []);

  // Blokowanie scrollowania pod modalem
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [activeModal]);

  if (loading) return <Loader />;

  const links = [
    {
      title: 'Wpłacam darowiznę',
      // Zamiast url, używamy akcji onClick
      onClick: () => setActiveModal('donate'),
      icon: <FaHandHoldingHeart className="text-2xl" />,
      description: 'Wspieram wasze działania'
    },
    {
      title: 'Zapisuję się do\u00a0newslettera',
      onClick: () => setActiveModal('newsletter'),
      icon: <FaEnvelope className="text-2xl" />,
      description: 'Chcę być na bieżąco'
    },
    ...(joinLink?.survey_url ? [{
      title: 'Dołączam do\u00a0wolontariatu',
      url: joinLink.survey_url,
      icon: <FaUserPlus className="text-2xl" />,
      description: 'Jestem częścią zmiany'
    }] : []),
    ...(socialLinks?.instagram ? [{
      title: 'Instagram',
      url: socialLinks.instagram,
      icon: <FaInstagram className="text-2xl" />,
      description: '@fundacjazaplon'
    }] : []),
    {
      title: 'LinkedIn',
      url: socialLinks.linkedin,
      icon: <FaLinkedin className="text-2xl" />,
      description: 'Obserwuj nas'
    },
    {
      title: 'zaplon.org.pl',
      url: 'https://zaplon.org.pl',
      icon: <FaGlobe className="text-2xl" />,
      description: 'Nasza strona główna'
    }
  ];

  return (
    <>
      <Seo
        title='Linki | Fundacja „Zapłon”'
        description="Wszystkie ważne linki Fundacji „Zapłon” w jednym miejscu"
      />
      
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-2 px-4">
        <div className="w-full max-w-2xl mx-auto">
          {/* Header with logo and description */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 ">Fundacja „Zapłon”</h1>
            <p className="text-text-black/70">
              Wspieramy aktywność społeczną i budujemy kapitał społeczny
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            {links.map((link, index) => {
              // Wspólne klasy dla przycisku i linku
              const itemClasses = "block w-full text-left bg-base-200 hover:bg-brand hover:text-white border border-white/20 rounded-2xl p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg group cursor-pointer";
              
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

              // Renderowanie jako przycisk (dla modali)
              if (link.onClick) {
                return (
                  <button key={index} onClick={link.onClick} className={itemClasses}>
                    {content}
                  </button>
                );
              }

              // Renderowanie jako link (dla zewnętrznych URL)
              return (
                <a
                  key={index}
                  href={link.url}
                  target={link.url.startsWith('http') && !link.url.includes('zaplon.org.pl') ? '_blank' : undefined}
                  rel={link.url.startsWith('http') && !link.url.includes('zaplon.org.pl') ? 'noopener noreferrer' : undefined}
                  className={itemClasses}
                >
                  {content}
                </a>
              );
            })}
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-sm text-text-black/70">
            <p>© {new Date().getFullYear()} Fundacja „Zapłon"</p>
            <p className="mt-1">
              <a href="mailto:biuro@zaplon.org.pl" className="hover:underline">
                biuro@zaplon.org.pl
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* MODALE */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          {/* Tło klikalne do zamykania */}
          <div className="absolute inset-0" onClick={() => setActiveModal(null)}></div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
              <FaXmark className="w-5 h-5"/>
            </button>
            
              {activeModal === 'donate' && <DonateCard />}
              {activeModal === 'newsletter' && <NewsletterCard />}
          </div>
        </div>
      )}
    </>
  );
}