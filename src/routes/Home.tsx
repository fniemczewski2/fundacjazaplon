import { Link } from 'wouter';
import { FaArrowRight } from 'react-icons/fa6';
import Seo from '../components/Seo';
import Hero from '../components/Hero';
import SupportPillars from '../components/SupportPillars';
import MissionBand from '../components/MissionBand';
import RecentPosts from '../components/RecentPosts';
import DonateCard from '../components/DonateCard';
import NewsletterCard from '../components/NewsletterCard';
import JoinUsCard from '../components/JoinUsCard';
import Reveal from '../components/Reveal';
import Illustration from '../components/Illustration';
import { useJoinLink } from '../hooks/useAppData';
import { useScrollToHash } from '../hooks/useScrollToHash';

export default function Home() {
  useScrollToHash(true);

  const { data: joinLink } = useJoinLink();
  const joinUrl = joinLink?.survey_url ?? null;

  return (
    <>
      <Seo
        title="Fundacja „Zapłon” - wspieramy aktywność społeczną"
        description="Fundacja „Zapłon” wspiera osoby angażujące się społecznie, buduje kapitał społeczny i wzmacnia organizacje pozarządowe. Dołącz do naszych działań."
      />

      {/* Jeden H1 na stronę - jest nim nagłówek hero. Wcześniej strona miała
          dwa: ukryty w sekcji i widoczny w komponencie Hero. */}
      <Hero
        eyebrow="Fundacja Zapłon"
        title="Zapalamy"
        highlight="aktywność."
        subtitle="Wspieramy osoby angażujące się społecznie i motywujemy do działania. Budujemy kapitał społeczny i zaufanie do organizacji pozarządowych. Dajemy narzędzia do zmiany."
        primaryCta={{ label: 'Wspieram', href: '/#donate' }}
        secondaryCta={
          joinUrl
            ? { label: 'Dołączam', href: joinUrl, external: true }
            : { label: 'Poznaj nas', href: '/o-nas' }
        }
      />

      <SupportPillars />

      <MissionBand />

      <RecentPosts />

      {/* Materiały - most między „chcę pomóc” a „potrzebuję pomocy”. */}
      <section aria-labelledby="materials-title" className="section-gap container-max">
        <Reveal>
          <div className="card panel-cool grid items-center gap-8 p-8 md:grid-cols-[auto_1fr] md:p-10">
            <div aria-hidden="true" className="mx-auto w-32 md:w-44">
              <Illustration name="notes" />
            </div>

            <div>
              <p className="eyebrow mb-4">Do pobrania</p>
              <h2 id="materials-title" className="section-title">
                Poradniki, których sami szukaliśmy
              </h2>
              <p className="lead mt-4 max-w-2xl">
                Zebraliśmy to, co najczęściej przydaje się na starcie: formalności, planowanie
                działań, rozliczenia. Za darmo.
              </p>
              <Link href="/materialy" className="btn btn-secondary mt-7">
                Zobacz materiały
                <FaArrowRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Sekcje poniżej nie mają własnych `aria-labelledby` - nagłówek H2
          jest w środku karty i sam pełni tę rolę. Wcześniej obok widocznego
          tytułu stał drugi, ukryty, przez co spis nagłówków w czytniku
          ekranu pokazywał każdą pozycję dwa razy. */}
      <section id="donate" className="section-gap container-max scroll-mt-28">
        <Reveal>
          <DonateCard />
        </Reveal>
      </section>

      <section className="section-gap container-max">
        <Reveal>
          <NewsletterCard />
        </Reveal>
      </section>

      <section className="section-gap container-max pb-20">
        <Reveal>
          <JoinUsCard />
        </Reveal>
      </section>
    </>
  );
}
