import { Link } from 'wouter';
import Seo from '../components/Seo';
import Illustration from '../components/Illustration';

export default function NotFound() {
  return (
    <>
      <Seo
        title="Nie znaleziono strony | Fundacja „Zapłon”"
        description="Strona, której szukasz, nie istnieje."
      />

      <div className="container-prose grid min-h-[70vh] place-items-center py-16 text-center">
        <div>
          <div aria-hidden="true" className="mx-auto mb-8 w-24 opacity-90">
            <Illustration name="gasnica" priority />
          </div>

          <p className="eyebrow mb-4 justify-center">Błąd 404</p>
          <h1 className="section-title">Nie znaleźliśmy tej strony</h1>

          <p className="lead mt-5">
            Adres mógł się zmienić albo strona nigdy nie istniała. Sprawdź, czy link jest poprawny,
            albo zacznij od strony głównej.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn btn-primary">
              Strona główna
            </Link>
            <Link to="/kontakt" className="btn btn-secondary">
              Napisz do nas
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
