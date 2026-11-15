import { Link, useSearch } from 'wouter';
import Seo from '../components/Seo';
import Illustration from '../components/Illustration';
import ManageSubscriptionButton from '../components/ManageSubscriptionButton';

const SESSION_ID_RE = /^cs_live_[A-Za-z0-9]{10,250}$/;

export default function ThankYou() {
  const params = new URLSearchParams(useSearch());
  const sessionId = params.get('session_id') ?? '';
  // Wskazówka z adresu tylko decyduje o pokazaniu przycisku; uprawnienie sprawdza serwer przy otwarciu panelu.
  const recurring = params.get('typ') === 'cykliczna' && SESSION_ID_RE.test(sessionId);

  return (
    <>
      <Seo
        title="Dziękujemy! | Fundacja „Zapłon”"
        description="Dziękujemy za wsparcie Fundacji „Zapłon”."
        noindex
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

          {recurring && (
            <div className="mt-8 flex flex-col items-center gap-3 text-sm">
              <p>
                Wpłata będzie pobierana co miesiąc. Możesz z niej zrezygnować albo zmienić kartę w
                każdej chwili: teraz tym przyciskiem, a później na stronie{' '}
                <Link to="/subskrypcja" className="underline">
                  wpłaty cyklicznej
                </Link>
                .
              </p>
              <ManageSubscriptionButton sessionId={sessionId} />
            </div>
          )}

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
