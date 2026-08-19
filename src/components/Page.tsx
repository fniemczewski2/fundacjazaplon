import Reveal from './Reveal';
import Illustration, { type IllustrationName } from './Illustration';

type Props = {
  /** Nagłówek H1 podstrony. Każda strona ma dokładnie jeden. */
  title: string;
  /** Krótkie zdanie wprowadzające pod nagłówkiem. */
  lead?: string;
  /** Nadlinia - nazwa działu, w którym użytkownik się znajduje. */
  eyebrow?: string;
  /** Ilustracja przy nagłówku. Dekoracyjna, nieczytana przez czytniki. */
  illustration?: IllustrationName;
  /** Szerokość treści: `wide` dla siatek, `prose` dla tekstu ciągłego. */
  width?: 'wide' | 'prose';
  children: React.ReactNode;
};

export default function Page({
  title,
  lead,
  eyebrow,
  illustration,
  width = 'wide',
  children,
}: Props) {
  return (
    <>
      <header className="border-b panel-cool">
        <div className="container-max flex items-center justify-between gap-8 py-12 md:py-16">
          <Reveal className="min-w-0">
            {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
            <h1 className="section-title">{title}</h1>
            {lead && <p className="lead mt-4 max-w-2xl">{lead}</p>}
          </Reveal>

          {illustration && (
            <Reveal direction="zoom" delay={120} className="hidden shrink-0 sm:block">
              <Illustration name={illustration} className="w-28 md:w-36" priority />
            </Reveal>
          )}
        </div>
      </header>

      <div
        className={
          width === 'prose'
            ? 'container-prose py-12 md:py-16'
            : 'container-max py-12 md:py-16'
        }
      >
        {children}
      </div>
    </>
  );
}
