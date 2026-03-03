// src/routes/About.tsx
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Seo from '../components/Seo';
import { getAbout, getPillars, type AboutInfo, type Pillar } from '../lib/about';
import Card from '../components/Card';
import Loader from '../components/Loader';

export default function About() {
  const [about, setAbout] = useState<AboutInfo | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, p] = await Promise.all([getAbout(), getPillars()]);
      setAbout(a);
      setPillars(p);
      setLoading(false);
    })();
  }, []);

  const descriptionBlocks = about?.description_md
    ? about.description_md
        .split(/^\s*---\s*$/m)
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  return (
    <>
      <Seo
        title="O nas | Fundacja „Zapłon”"
        description="Poznaj misję, wartości i działania Fundacji „Zapłon”. Wspieramy aktywność społeczną, budujemy kapitał społeczny i wzmacniamy organizacje pozarządowe."
      />

      <h1 className="section-title mt-8">O nas</h1>

      <div className="container mx-auto mt-6 p-4 space-y-12">
        {loading && <Loader />}

        {!loading && descriptionBlocks.length > 0 && (
          <section aria-labelledby="about-desc">
            <h2 id="about-desc" className="sr-only">Opis fundacji</h2>
            <Card>
              {descriptionBlocks.map((block, idx) => (
                <div key={idx} className="py-2 text-md md:text-xl prose max-w-none">
                  <ReactMarkdown>{block}</ReactMarkdown>
                </div>
              ))}
            </Card>
          </section>
        )}

        {!loading && pillars.length > 0 && (
          <section aria-labelledby="pillars-title">
            <h2 id="pillars-title" className="text-3xl font-bold mb-8 text-center text-text-black dark:text-white font-['Signika']">
              Filary naszej działalności
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch">
              {pillars.map((p) => (
                <Card key={p.id || `pillar-${p.order_index}`}>
                  <div className="flex flex-col items-center h-full">
                    {/* Wyświetlanie obrazka */}
                    {p.image_url && (
                      <div className="w-20 h-20 mb-5 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-full p-4 shadow-inner">
                        <img 
                          src={p.image_url} 
                          alt={`Ikona filaru: ${p.title}`} 
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
                    
                    <h3 className="text-xl font-bold text-center mb-3 text-text-black dark:text-white">
                      {p.title}
                    </h3>
                    
                    {p.body_md && (
                      <div className="prose max-w-none text-sm text-center text-gray-600 dark:text-gray-300 mt-auto">
                        <ReactMarkdown>{p.body_md}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}