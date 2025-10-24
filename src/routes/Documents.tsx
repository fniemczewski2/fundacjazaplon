// src/routes/Documents.tsx
import { useEffect, useState } from 'react';
import { ALL_CATEGORIES, type DocCategory, listDocuments } from '../lib/documents';
import Seo from '../components/Seo';
import Card from '../components/Card';
import { FaDownload } from 'react-icons/fa6';
import Loader from '../components/Loader';

type Group = { key: DocCategory; label: string; items: Array<{ name: string; url: string }> };

export default function Documents() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res: Group[] = [];
      for (const c of ALL_CATEGORIES) {
        const items = await listDocuments(c.key);
        res.push({ key: c.key, label: c.label, items: items.map(i => ({ name: i.name, url: i.url })) });
      }
      setGroups(res);
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <Seo title="Dokumenty | Fundacja „Zapłon”" />
      <h1 className="section-title">Dokumenty</h1>

      <div className="container mx-auto mt-6 p-4 max-w-4xl gap-6 grid">
        {loading ? (
          <Loader />
        ) : (
          (() => {
            const nonEmpty = groups.filter((g) => g.items.length > 0);
            if (nonEmpty.length === 0) {
              return <div className="text-text-black/70">Brak dokumentów.</div>;
            }

            return nonEmpty.map((g) => (
              <Card key={g.key}>
                <h2 className="text-xl font-semibold mb-3">{g.label}</h2>

                <ul className="divide-y gap-4">
                  {g.items.map((i) => {
                    let yearLabel: string | null = null;
                    if (g.key === 'sprawozdania') {
                      const match = i.name.match(/\b(20\d{2})\b/); 
                      yearLabel = match ? match[1] : '2025';
                    }

                    return (
                      <li key={i.url} className="py-2 flex items-center justify-between gap-3">
                        <a
                          href={i.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={'btn btn-secondary inline-flex items-center gap-2'}
                        >
                          {g.key === 'sprawozdania' ? (
                            <> {yearLabel} <FaDownload /> </>
                          ) : (
                            <>
                              Pobierz <FaDownload />
                            </>
                          )}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ));
          })()
        )}
      </div>
    </>
  );
}
