import Seo from './Seo';
import Page from './Page';
import { LEGAL_UPDATED, type LegalSection } from '../content/legal';

type Props = { title: string; description: string; path: string; lead: string; sections: LegalSection[] };

export default function LegalDocument({ title, description, path, lead, sections }: Readonly<Props>) {
  return (
    <>
      <Seo
        title={`${title} | Fundacja „Zapłon”`}
        description={description}
        breadcrumbs={[
          { name: 'Strona główna', path: '/' },
          { name: title, path },
        ]}
      />

      <Page eyebrow="Dokumenty prawne" title={title} lead={lead} width="prose">
        <p className="muted text-sm">Ostatnia aktualizacja: {LEGAL_UPDATED}</p>

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.heading} aria-labelledby={`legal-${section.heading.slice(0, 2)}`}>
              <h2 id={`legal-${section.heading.slice(0, 2)}`} className="font-heading text-xl font-semibold">
                {section.heading}
              </h2>
              {section.paragraphs?.map((text) => (
                <p key={text.slice(0, 40)} className="mt-3 leading-relaxed">
                  {text}
                </p>
              ))}
              {section.items && (
                <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed">
                  {section.items.map((item) => (
                    <li key={item.slice(0, 40)}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </Page>
    </>
  );
}
