import { Link } from 'wouter';
import Seo from '../components/Seo';
import Illustration from '../components/Illustration';

export default function ThankYou() {
  return (
    <>
      <Seo
        title="Dziękujemy! | Fundacja „Zapłon”"
        description="Dziękujemy za wsparcie Fundacji „Zapłon”."
      />

      <div className="container-prose grid min-h-[70vh] place-items-center py-16 text-center">
        <div>
          <div aria-hidden="true" className="mx-auto mb-8 w-28">
            <Illustration name="ognisko" priority glow />
          </div>

          <p className="eyebrow mb-4 justify-center">Wpłata przyjęta</p>
          <h1 className="section-title">Dziękujemy za wsparcie</h1>

          <p className="lead mt-5">
            Twoja wpłata pomoże młodym osobom aktywistycznym i wolontariackim doprowadzić ich
            działania do końca. Potwierdzenie płatności wysłaliśmy na Twój adres e-mail.
          </p>

          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn btn-primary">
              Wróć na stronę główną
            </Link>
            <Link to="/aktualnosci" className="btn btn-secondary">
              Zobacz, co robimy
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
