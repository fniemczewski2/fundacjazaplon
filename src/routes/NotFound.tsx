// src/routes/NotFound.tsx
import { Link } from 'wouter';
import Seo from '../components/Seo';

export default function NotFound() {
  return (
    <>
      <Seo title='Nie znaleziono strony | Fundacja „Zapłon”' description="Strona, której szukasz, nie istnieje." />
      <div className="min-h-[60vh] grid place-items-center text-center p-6">
        <div>
          <p className="text-6xl font-bold text-brand dark:text-accent-orange mb-4">404</p>
          <h1 className="text-2xl font-semibold mb-2">Nie znaleźliśmy tej strony.</h1>
          <p className="text-text-black/70 mb-8">
            Adres mógł się zmienić albo strona nigdy nie istniała. Sprawdź, czy link jest poprawny,
            albo wróć na stronę główną.
          </p>
          <Link to="/" className="btn btn-primary inline-flex">
            Strona główna
          </Link>
        </div>
      </div>
    </>
  );
}
