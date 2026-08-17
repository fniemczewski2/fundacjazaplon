import { useEffect, useState } from 'react';
import { FaDownload } from 'react-icons/fa6';
import Seo from '../components/Seo';
import Page from '../components/Page';
import Loader from '../components/Loader';
import Reveal from '../components/Reveal';
import { ALL_CATEGORIES, type DocCategory, listDocuments } from '../lib/documents';

type Group = {
  key: DocCategory;
  label: string;
  items: Array<{ name: string; url: string }>;
};

export default function Documents() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      const res = await Promise.all(
        ALL_CATEGORIES.map(async (c) => ({
          key: c.key,
          label: c.label,
          items: (await listDocuments(c.key)).map((i) => ({ name: i.name, url: i.url })),
        })),
      );

      if (!alive) return;
      setGroups(res);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const nonEmpty = groups.filter((g) => g.items.length > 0);

  return (
    <>
      <Seo
        title="Dokumenty | Fundacja „Zapłon”"
        description="Pobierz dokumenty Fundacji „Zapłon”: statut, uchwały, sprawozdania finansowe i merytoryczne."
      />

      <Page
        eyebrow="Jawność"
        title="Dokumenty"
        lead="Statut, uchwały i sprawozdania. Wszystko, czego można od nas oczekiwać - w jednym miejscu."
        illustration="fabryka"
        width="prose"
      >
        {loading && <Loader />}

        {!loading && nonEmpty.length === 0 && (
          <p className="muted">Nie opublikowaliśmy jeszcze żadnych dokumentów.</p>
        )}

        <div className="space-y-6">
          {nonEmpty.map((g, gi) => (
            <Reveal key={g.key} delay={gi * 90}>
              <section aria-labelledby={`docs-${g.key}`} className="card p-6 md:p-8">
                <h2 id={`docs-${g.key}`} className="font-heading text-xl font-semibold">
                  {g.label}
                </h2>

                <ul className="mt-4 divide-y">
                  {g.items.map((item) => (
                    <li
                      key={item.url}
                      className="flex flex-nowrap items-center justify-end gap-3 py-3"
                    >

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary shrink-0 px-4 py-2 text-sm"
                      >
                        Pobierz
                        <FaDownload aria-hidden="true" />
                        <span className="sr-only">: (item.name)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          ))}
        </div>
      </Page>
    </>
  );
}
