import { Link } from 'wouter';
import { FaArrowRight } from 'react-icons/fa6';
import Reveal from './Reveal';
import Illustration from './Illustration';

/**
 * Pasmo „kim jesteśmy” — jedyne miejsce na stronie głównej z odwróconymi
 * kolorami. Przerywa rytm jasnych sekcji i wyznacza połowę strony.
 */
export default function MissionBand() {
  return (
    <section
      aria-labelledby="mission-title"
      className="panel-brand on-brand section-gap relative overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(44rem 26rem at 12% 110%, rgb(255 169 98 / 0.22), transparent 62%)',
        }}
      />

      <div className="relative container-max grid items-center gap-12 py-16 md:py-24 lg:grid-cols-12">
        <Reveal direction="left" className="lg:col-span-7">
          <p className="eyebrow mb-5">Kim jesteśmy</p>

          <h2 id="mission-title" className="section-title">
            Fundacja-matronka kolektywów, ruchów i&nbsp;organizacji
          </h2>

          <p className="lead mt-6">
            Jesteśmy młodymi osobami, które w odpowiedzi na kryzysy współczesnego świata tworzą
            przestrzeń dla osób aktywistycznych, wolontariackich i&nbsp;działających społecznie.
            Budujemy kapitał społeczny i&nbsp;zaufanie do organizacji pozarządowych.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/o-nas" className="btn btn-ember">
              Poznaj naszą historię
              <FaArrowRight aria-hidden="true" />
            </Link>
            <Link href="/zespol" className="btn btn-secondary">
              Zobacz zespół
            </Link>
          </div>
        </Reveal>

        <Reveal direction="right" delay={140} className="lg:col-span-5">
          <div className="mx-auto w-56 md:w-72 lg:ml-auto">
            <Illustration name="megafon" float />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
