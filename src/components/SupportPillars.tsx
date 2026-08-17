import Reveal from './Reveal';
import Illustration, { type IllustrationName } from './Illustration';

/**
 * Pięć rodzajów wsparcia, każdy ze swoją ilustracją z zestawu fundacji.
 *
 * Treść jest tu celowo statyczna — to obietnica marki, nie dane operacyjne.
 * Jeśli ma być edytowalna z panelu, podepnij tabelę `pillars` (jak na
 * podstronie „O nas”) i zostaw tę listę jako wartość zapasową.
 */

type Pillar = {
  illustration: IllustrationName;
  title: string;
  body: string;
};

const PILLARS: readonly Pillar[] = [
  {
    illustration: 'wsparcie-merytoryczne',
    title: 'Merytoryczne',
    body: 'Pomagamy zaplanować działanie i domknąć je od strony organizacyjnej. Łączymy z osobami, które robiły to wcześniej.',
  },
  {
    illustration: 'wsparcie-prawne',
    title: 'Prawne',
    body: 'Prowadzimy przez formalności: rejestracja, umowy, obowiązki sprawozdawcze, ochrona danych.',
  },
  {
    illustration: 'wsparcie-finansowe',
    title: 'Finansowe',
    body: 'Dokładamy się do kosztów działań i podpowiadamy, gdzie szukać pieniędzy na kolejne kroki.',
  },
  {
    illustration: 'wsparcie-lokalowe',
    title: 'Lokalowe',
    body: 'Udostępniamy miejsce na spotkania zespołu, warsztaty i pracę nad projektem.',
  },
  {
    illustration: 'wsparcie-psychologiczne',
    title: 'Psychologiczne',
    body: 'Rozmowa i konsultacje wtedy, gdy zaangażowanie zaczyna kosztować za dużo.',
  },
];

export default function SupportPillars() {
  return (
    <section id="wsparcie" aria-labelledby="wsparcie-title" className="section-gap container-max">
      <Reveal className="max-w-3xl">
        <p className="eyebrow mb-4">Co dostajesz</p>
        <h2 id="wsparcie-title" className="section-title">
          Pięć rodzajów wsparcia
        </h2>
        <p className="lead mt-4">
          Nie każdy pomysł potrzebuje tego samego. Powiedz nam, na czym utknęłaś lub utknąłeś —
          dobierzemy pomoc z tej listy.
        </p>
      </Reveal>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PILLARS.map((pillar, i) => (
          <Reveal as="li" key={pillar.title} delay={i * 90} className="h-full">
            <article className="card card-interactive flex h-full flex-col p-6">
              <div className="mb-5 flex h-24 items-end">
                <Illustration name={pillar.illustration} className="max-h-24 w-auto" />
              </div>

              <h3 className="font-heading text-xl font-semibold">{pillar.title}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{pillar.body}</p>
            </article>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
