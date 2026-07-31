import { Link } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa6';
import Seo from '../components/Seo';

/**
 * Docelowa strona `success_url` z `api/create-stripe-session.ts`. Wcześniej ta
 * trasa nie istniała w ogóle — darczyńca po realnie udanej płatności trafiał
 * na stronę 404 zamiast na potwierdzenie.
 */
export default function ThankYou() {
  return (
    <>
      <Seo title='Dziękujemy! | Fundacja „Zapłon”' description="Dziękujemy za wsparcie Fundacji „Zapłon”." />
      <div className="min-h-[60vh] grid place-items-center text-center p-6">
        <div className="max-w-lg">
          <FaHeart className="text-5xl text-accent-orange mx-auto mb-6" aria-hidden="true" />
          <h1 className="section-title mb-4">Dziękujemy za wsparcie!</h1>
          <p className="text-text-black/80 mb-8">
            Twoja wpłata dotarła do nas i pomoże młodym osobom aktywistycznym oraz wolontariuszom
            realizować ich działania. Potwierdzenie płatności wysłaliśmy na Twój adres e-mail.
          </p>
          <Link to="/" className="btn btn-primary inline-flex">
            Wróć na stronę główną
          </Link>
        </div>
      </div>
    </>
  );
}
