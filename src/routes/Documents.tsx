// src/routes/Documents.tsx
import { useEffect, useState } from 'react';
import { ALL_CATEGORIES, type DocCategory, listDocuments } from '../lib/documents';
import Seo from '../components/Seo';
import Card from '../components/Card';
import { FaDownload } from 'react-icons/fa6';
import Loader from '../components/Loader';

type Group = {
  key: DocCategory;
  label: string;
  items: Array<{ name: string; url: string }>;
};

export default function Documents() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res: Group[] = [];

      for (const c of ALL_CATEGORIES) {
        const items = await listDocuments(c.key);
        res.push({
          key: c.key,
          label: c.label,
          items: items.map((i) => ({ name: i.name, url: i.url })),
        });
      }

      setGroups(res);
      setLoading(false);
    })();
  }, []);

  const nonEmpty = groups.filter((g) => g.items.length > 0);

  return (
    <>
      <Seo
        title="Dokumenty | Fundacja „Zapłon”"
        description="Pobierz dokumenty Fundacji Zapłon: statuty, uchwały, sprawozdania finansowe i merytoryczne."
      />

      <h1 className="section-title">Dokumenty</h1>

      <div className="container mx-auto mt-6 p-4 max-w-4xl grid gap-6">
        {loading && <Loader />}

        {!loading && nonEmpty.length === 0 && (
          <p className="text-text-black/70">Brak dokumentów.</p>
        )}

        {!loading &&
          nonEmpty.map((g) => (
            <Card key={g.key}>
              <section aria-labelledby={`docs-${g.key}`}>
                <h2 id={`docs-${g.key}`} className="text-xl font-semibold mb-3">
                  {g.label}
                </h2>

                <ul className="divide-y">
                  {g.items.map((i) => {
                    let yearLabel: string | null = null;

                    if (g.key === 'sprawozdania') {
                      const match = i.name.match(/\b(20\d{2})\b/);
                      yearLabel = match ? match[1] : 'n/d';
                    }

                    return (
                      <li
                        key={i.url}
                        className="py-3 flex items-center justify-center gap-3"
                      >
                        {yearLabel && (
                          <span className="text-sm md:text-base">
                            {`Sprawozdanie ${yearLabel}`}
                          </span>
                        )}

                        <a
                          href={i.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary inline-flex items-center gap-2"
                          aria-label={`Pobierz dokument: ${i.name}`}
                        >
                          Pobierz <FaDownload />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </Card>
          ))}
      </div>
    </>
  );
}
