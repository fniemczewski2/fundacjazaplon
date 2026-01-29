// src/routes/Links.jsx
import { useEffect, useState } from 'react';
import { FaInstagram, FaLinkedin, FaGlobe, FaHandHoldingHeart, FaUserPlus } from 'react-icons/fa6';
import { getSocialLinks } from '../lib/social';
import { getJoinLink } from '../lib/join';
import Seo from '../components/Seo';
import Loader from '../components/Loader';

export default function Links() {
  const [socialLinks, setSocialLinks] = useState(null);
  const [joinLink, setJoinLink] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <Loader />;

  const links = [
    {
      title: 'Wpłać darowiznę',
      url: '/#donate',
      icon: <FaHandHoldingHeart className="text-2xl" />,
      description: 'Wesprzyj nasze działania'
    },
    ...(joinLink?.survey_url ? [{
      title: 'Dołącz do wolontariatu',
      url: joinLink.survey_url,
      icon: <FaUserPlus className="text-2xl" />,
      description: 'Zostań wolontariuszem'
    }] : []),
    ...(socialLinks?.instagram ? [{
      title: 'Instagram',
      url: socialLinks.instagram,
      icon: <FaInstagram className="text-2xl" />,
      description: '@fundacjazaplon'
    }] : []),
    {
      title: 'LinkedIn',
      url: 'https://www.linkedin.com/company/fundacja-zap%C5%82on/',
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
        title='Linki | Fundacja „Zapłon"'
        description="Wszystkie ważne linki Fundacji Zapłon w jednym miejscu"
      />
      
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-2 px-4">
        <div className="w-full max-w-2xl mx-auto">
          {/* Header with logo and description */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Fundacja „Zapłon"</h1>
            <p className="text-text-black/70">
              Wspieramy aktywność społeczną i budujemy kapitał społeczny
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            {links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target={link.url.startsWith('http') && !link.url.includes('zaplon.org.pl') ? '_blank' : undefined}
                rel={link.url.startsWith('http') && !link.url.includes('zaplon.org.pl') ? 'noopener noreferrer' : undefined}
                className="block w-full bg-base-200 hover:bg-brand hover:text-white border border-white/20 rounded-2xl p-6 transition-all duration-200 hover:scale-105 hover:shadow-lg group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 text-text-black group-hover:text-white transition-colors">
                    {link.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-text-black group-hover:text-white text-lg transition-colors">
                      {link.title}
                    </div>
                    {link.description && (
                      <div className="text-sm text-text-black/70 group-hover:text-white/80 transition-colors">
                        {link.description}
                      </div>
                    )}
                  </div>
                </div>
              </a>
            ))}
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
    </>
  );
}