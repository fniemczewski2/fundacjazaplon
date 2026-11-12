import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { applyConsent, readConsent, setConsent } from '../lib/analytics';
import { CONSENT_REOPEN_EVENT } from '../lib/config';

/** Baner zgody na analitykę. Do czasu wyboru (i po odmowie) żadne dane nie trafiają do Google. */
export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(() => readConsent() === null);

  useEffect(() => {
    applyConsent(readConsent());

    const reopen = () => setIsVisible(true);
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen);
  }, []);

  const choose = (value: 'accepted' | 'rejected') => {
    setConsent(value);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <section
      aria-label="Zgoda na pliki cookie"
      className="fixed bottom-0 left-0 z-[9999] flex w-full flex-col items-center justify-between gap-4 border-t-2 border-line bg-surface-raised px-6 py-4 font-sans text-ink md:flex-row"
    >
      <p className="m-0 max-w-3xl text-center text-sm leading-relaxed md:text-left">
        <strong>Szanujemy Twoją prywatność.</strong> Używamy plików cookie do statystyk (Google Analytics), ale
        tylko za Twoją zgodą. Wybór możesz zmienić w każdej chwili w stopce strony. Szczegóły:{' '}
        <Link href="/polityka-prywatnosci" className="link-accent">
          Polityka prywatności
        </Link>
        .
      </p>
      <div className="flex shrink-0 gap-3">
        <button type="button" onClick={() => choose('accepted')} className="btn btn-primary inline-flex">
          Akceptuję
        </button>
        <button type="button" onClick={() => choose('rejected')} className="btn btn-secondary inline-flex">
          Odrzucam
        </button>
      </div>
    </section>
  );
}
