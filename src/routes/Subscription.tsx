import Page from '../components/Page';
import Seo from '../components/Seo';
import { useContactInfo } from '../hooks/useAppData';
import { STRIPE_PORTAL_LOGIN_URL } from '../lib/config';

export default function Subscription() {
  const { data } = useContactInfo();
  const email = data?.email?.trim();

  return (
    <>
      <Seo
        title="Wpłata cykliczna | Fundacja „Zapłon”"
        description="Zrezygnuj z wpłaty cyklicznej albo zmień kartę."
        noindex
      />
      <Page
        title="Wpłata cykliczna"
        lead="Comiesięczną wpłatę możesz anulować w każdej chwili."
        width="prose"
      >
        <div className="card space-y-4 p-6 md:p-8">
          <h2 className="font-heading text-2xl font-semibold">Zrezygnuj lub zmień wpłatę</h2>
          <p>
            Po anulowaniu kolejne płatności nie będą pobierane, a wpłaty już przekazane pozostają na
            cele Fundacji.
          </p>

          {STRIPE_PORTAL_LOGIN_URL ? (
            <>
              <p>
                Podaj adres e-mail użyty przy wpłacie. Stripe, nasz operator płatności, wyśle na
                niego jednorazowy kod logowania. W panelu anulujesz wpłatę, zmienisz kartę albo
                pobierzesz potwierdzenia.
              </p>
              <a href={STRIPE_PORTAL_LOGIN_URL} className="btn btn-primary" rel="noreferrer">
                Zarządzaj wpłatą w Stripe
              </a>
              {email && (
                <p className="muted text-sm">
                  Kod nie dochodzi albo nie pamiętasz adresu? Napisz na{' '}
                  <a className="underline" href={`mailto:${email}`}>
                    {email}
                  </a>
                  , a anulujemy wpłatę za Ciebie.
                </p>
              )}
            </>
          ) : (
            <p>
              Napisz do nas
              {email ? (
                <>
                  {' '}
                  na{' '}
                  <a
                    className="underline"
                    href={`mailto:${email}?subject=Rezygnacja%20z%20wp%C5%82aty%20cyklicznej`}
                  >
                    {email}
                  </a>
                </>
              ) : null}{' '}
              z adresu użytego przy wpłacie, a anulujemy ją.
            </p>
          )}
        </div>
      </Page>
    </>
  );
}
