// src/routes/About.tsx
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Seo from '../components/Seo';
import { getAbout, getPillars, type AboutInfo, type Pillar } from '../lib/about';
import Card from '../components/Card';

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
        description="Poznaj misję, wartości i działania Fundacji Zapłon. Wspieramy aktywność społeczną, budujemy kapitał społeczny i wzmacniamy organizacje pozarządowe."
      />

      <h1 className="section-title">O nas</h1>

      <div className="container mx-auto mt-6 p-4 space-y-10">
        {loading && <p className="opacity-70">Wczytywanie…</p>}

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
            <h2 id="pillars-title" className="text-2xl font-semibold mb-4">
              Filary naszej działalności
            </h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {pillars.map((p) => (
                <Card key={p.id || `pillar-${p.order_index}`}>
                  <h3 className="text-xl font-medium text-center">{p.title}</h3>
                  {p.body_md && (
                    <div className="prose max-w-none text-sm mt-2">
                      <ReactMarkdown>{p.body_md}</ReactMarkdown>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
