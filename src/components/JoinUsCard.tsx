import { useJoinLink } from '../hooks/useAppData';
import { FaArrowRight } from 'react-icons/fa6';
import Illustration from './Illustration';

export default function JoinUsCard() {
  const { data, isLoading } = useJoinLink();
  const url = data?.survey_url ?? null;

  // Szkielet o wysokości docelowej karty. Bez tego układ przeskakiwał
  // w momencie, gdy dane dojechały z Supabase.
  if (isLoading) {
    return (
      <div className="card animate-pulse p-8" aria-hidden="true">
        <div className="mx-auto h-7 w-48 rounded-full bg-[var(--color-line)]" />
        <div className="mx-auto mt-4 h-4 w-72 max-w-full rounded-full bg-[var(--color-line)]" />
        <div className="mx-auto mt-8 h-11 w-40 rounded-full bg-[var(--color-line)]" />
      </div>
    );
  }

  if (!url) return null;

  return (
    <div className="card panel-warm relative overflow-hidden p-6 md:p-10">
      <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className="eyebrow mb-4">Wolontariat</p>
          <h2 className="section-title">Dołącz do nas</h2>
          <p className="lead mt-4 max-w-xl">
            Szukamy osób, które chcą działać - nie tylko obserwować. Wypełnij krótką ankietę,
            odezwiemy się z propozycją.
          </p>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ember mt-7"
          >
            Wypełnij ankietę
            <FaArrowRight aria-hidden="true" />
            <span className="sr-only">- otwiera się w nowej karcie</span>
          </a>
        </div>

        <div aria-hidden="true" className="mx-auto w-40 md:w-52">
          <Illustration name="skrzynka" float />
        </div>
      </div>
    </div>
  );
}
