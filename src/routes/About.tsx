// src/routes/About.tsx
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Seo from '../components/Seo';
import { getAbout, getPillars, type AboutInfo, type Pillar } from '../lib/about';
import Card from '../components/Card';

export default function About() {
  const [about, setAbout] = useState<AboutInfo | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);

  useEffect(() => {
    (async () => {
      const [a, p] = await Promise.all([getAbout(), getPillars()]);
      setAbout(a);
      setPillars(p);
    })();
  }, []);

  const descriptionBlocks = about?.description_md
    ? about.description_md.split(/^\s*---\s*$/m).map((part) => part.trim()).filter(Boolean)
    : [];

  return (
    <>
      <Seo title="O nas | Fundacja „Zapłon”" />
      <h1 className="section-title">O nas</h1>
      <div className="container mx-auto mt-6 p-4 space-y-8">

        <section>
          {descriptionBlocks.length > 0&& (
            <Card>
              {descriptionBlocks.map((block, idx) => (
                <div key={idx} className='py-2 text-md md:text-xl'>
                  <ReactMarkdown>{block}</ReactMarkdown>
                </div>
              ))}
            </Card>
          )}
        </section>
        {pillars.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Filary naszej działalności</h2>
          
            <div className="grid gap-4 lg:grid-cols-5">
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
