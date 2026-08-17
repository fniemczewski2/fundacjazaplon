import { Link } from 'wouter';
import { FaArrowRight } from 'react-icons/fa6';
import Reveal from './Reveal';
import Illustration, { type IllustrationName } from './Illustration';

/**
 * Pięć rodzajów wsparcia.
 *
 * Opisy są skrótem tekstu z wpisu „Jakiego wsparcia udzielamy?”
 * (/aktualnosci/wsparcie) - to Wasze słowa, nie moja parafraza. Zachowany
 * jest też czas gramatyczny oryginału: część działań już trwa, część jest
 * zapowiedzią.
 *
 * Kolejność odpowiada `order_index` z tabeli `about_pillars`, więc strona
 * główna i podstrona „O nas” pokazują filary w tej samej kolejności.
 *
 * `soon: true` odwzorowuje wartość „(wkrótce)” zapisaną w `body_md`.
 */

type Pillar = {
  illustration: IllustrationName;
  title: string;
  body: string;
  soon?: boolean;
};

const PILLARS: readonly Pillar[] = [
  {
    illustration: 'wsparcie-merytoryczne',
    title: 'Merytoryczne',
    body: 'Organizujemy szkolenia i warsztaty, które wzmacniają kompetencje osób działających społecznie. Dzielimy się wiedzą i doświadczeniem.',
  },
  {
    illustration: 'wsparcie-psychologiczne',
    title: 'Psychologiczne',
    body: 'Zapewnimy pomoc psychologiczną, bo praca społeczna bywa wymagająca. Dbamy o Wasze zdrowie psychiczne.',
    soon: true,
  },
  {
    illustration: 'wsparcie-finansowe',
    title: 'Finansowe',
    body: 'Dotujemy organizacje, grupy nieformalne i inicjatywy. Pomagamy pozyskiwać środki, żeby Wasze projekty mogły zaistnieć.',
  },
  {
    illustration: 'wsparcie-lokalowe',
    title: 'Lokalowe',
    body: 'Tworzymy centrum aktywizmu klimatycznego i społecznego - przestrzeń do pracy, spotkań i rozwoju.',
    soon: true,
  },
  {
    illustration: 'wsparcie-prawne',
    title: 'Prawne',
    body: 'Poradnictwo obywatelskie i podnoszenie świadomości prawnej. Planujemy także zapewnić Wam ochronę prawną.',
    soon: true,
  },
];

export default function SupportPillars() {
  return (
    <section id="wsparcie" aria-labelledby="wsparcie-title" className="section-gap container-max">
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="eyebrow mb-4">Co dostajesz</p>
          <h2 id="wsparcie-title" className="section-title">
            Pięć rodzajów wsparcia
          </h2>
          <p className="lead mt-4">
            Nie każdy pomysł potrzebuje tego samego. Powiedz nam, na czym utknęłaś lub utknąłeś -
            dobierzemy pomoc z tej listy.
          </p>
        </div>

        <Link to="/aktualnosci/wsparcie" className="link-accent inline-flex items-center gap-2">
          Szczegóły wsparcia
          <FaArrowRight aria-hidden="true" />
        </Link>
      </Reveal>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PILLARS.map((pillar, i) => (
          <Reveal as="li" key={pillar.title} delay={i * 90} className="h-full">
            <article className="card flex h-full flex-col p-6">
              <div className="mb-5 flex h-24 items-end">
                <Illustration name={pillar.illustration} className="max-h-24 w-auto" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-xl font-semibold">{pillar.title}</h3>
                {pillar.soon && <span className="badge">Wkrótce</span>}
              </div>

              <p className="muted mt-2 text-sm leading-relaxed">{pillar.body}</p>
            </article>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
