import { useId, useState } from 'react';
import { useContactInfo } from '../hooks/useAppData';
import { getErrorMessage } from '../lib/utils/errors';
import { FiCopy, FiCheck } from 'react-icons/fi';
import { FaArrowRight, FaCreditCard, FaArrowLeft } from 'react-icons/fa6';
import PrivacyPolicyLink from './PrivacyPolicyLink';
import Illustration from './Illustration';

type Props = { title?: string };

const AMOUNTS = [20, 50, 100] as const;

export default function DonateCard({ title = 'Wspieram' }: Props) {
  const { data } = useContactInfo();
  const [copied, setCopied] = useState(false);

  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState<number>(50);
  const [isRecurring, setIsRecurring] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');

  const nameId = useId();
  const emailId = useId();
  const consentId = useId();
  const frequencyLabelId = useId();
  const amountLabelId = useId();

  const acct = data?.account_number?.trim();

  const copy = async () => {
    if (!acct) return;
    try {
      await navigator.clipboard.writeText(acct);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Nie udało się skopiować numeru konta', e);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;

    setIsStripeLoading(true);
    setStripeError('');

    try {
      const response = await fetch('/api/create-stripe-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, isRecurring, name, email, marketingConsent }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Nie udało się połączyć z operatorem płatności.');
      }

      if (result.url) window.location.href = result.url;
    } catch (err) {
      console.error(err);
      setStripeError(getErrorMessage(err, 'Nie udało się połączyć z operatorem płatności.'));
      setIsStripeLoading(false);
    }
  };

  return (
    <div className="card relative overflow-hidden p-6 md:p-10" id="donate" >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 -right-8 w-40 opacity-10 md:w-52"
      >
        <Illustration name="moneta" />
      </div>

      <div className="relative mx-auto max-w-md">
        <div className="text-center">
          <p className="eyebrow mb-4 justify-center">Darowizna</p>
          <h2 className="section-title">{title}</h2>
          <p className="lead mt-4">
            Twoja wpłata idzie wprost na wsparcie osób, które działają społecznie.
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleNextStep} className="animate-fade-in mt-8">
            {/* Częstotliwość - grupa przycisków ze stanem `aria-pressed`,
                dzięki czemu czytnik ekranu mówi, która opcja jest wybrana. */}
            <p id={frequencyLabelId} className="field-label">
              Jak często chcesz wspierać?
            </p>
            <div
              role="group"
              aria-labelledby={frequencyLabelId}
              className="relative mb-6 flex rounded-full border p-1 panel-cool"
            >
              <span
                aria-hidden="true"
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-brand transition-transform duration-300"
                style={{
                  transform: isRecurring ? 'translateX(100%)' : 'translateX(0)',
                  transitionTimingFunction: 'var(--ease-out-soft)',
                }}
              />
              {[
                { value: false, label: 'Jednorazowo' },
                { value: true, label: 'Co miesiąc' },
              ].map((option) => {
                const active = isRecurring === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setIsRecurring(option.value)}
                    className={`relative z-10 flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300 ${
                      active ? 'text-white' : 'text-ink hover:text-ember-ink'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <p id={amountLabelId} className="field-label">
              Kwota
            </p>
            <div role="group" aria-labelledby={amountLabelId} className="mb-7 grid grid-cols-3 gap-2">
              {AMOUNTS.map((val) => {
                const active = amount === val;
                return (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setAmount(val)}
                    className={`btn justify-center ${active ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {val}&nbsp;zł
                  </button>
                );
              })}
            </div>

            <button type="submit" className="btn btn-ember w-full">
              Dalej <FaArrowRight aria-hidden="true" />
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStripePayment} className="animate-fade-in mt-8 text-left">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="link-quiet mb-5 inline-flex items-center gap-2 text-sm"
            >
              <FaArrowLeft aria-hidden="true" /> Wróć do wyboru kwoty
            </button>

            <h3 className="font-heading text-lg font-semibold">Pozostańmy w kontakcie</h3>
            <p className="field-hint mt-1 mb-5 leading-relaxed">
              Zostaw dane, żebyśmy mogli podziękować i&nbsp;pokazać, co udało się zrobić dzięki
              Twojej wpłacie.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor={nameId} className="field-label">
                  Imię
                </label>
                <input
                  id={nameId}
                  type="text"
                  required
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-text"
                />
              </div>

              <div>
                <label htmlFor={emailId} className="field-label">
                  Adres e-mail
                </label>
                <input
                  id={emailId}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-text"
                />
              </div>
            </div>

            <button type="submit" disabled={isStripeLoading} className="btn btn-ember mt-6 w-full">
              {isStripeLoading ? (
                'Przekierowujemy do płatności…'
              ) : (
                <>
                  Przekaż {amount}&nbsp;zł {isRecurring ? 'miesięcznie' : ''}
                  <FaCreditCard aria-hidden="true" />
                </>
              )}
            </button>

            <div className="mt-6 flex items-start gap-3">
              <input
                id={consentId}
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-1 size-4 shrink-0 accent-[var(--color-brand)]"
              />
              <label htmlFor={consentId} className="field-hint cursor-pointer leading-relaxed">
                Chcę dostawać od Fundacji „Zapłon” informacje o&nbsp;jej działaniach. Zgoda jest
                dobrowolna, niezależna od wpłaty i&nbsp;możesz ją w&nbsp;każdej chwili wycofać.
              </label>
            </div>

            <p className="field-hint mt-4 text-center leading-relaxed">
              Wpłacając, zgadzasz się na przetwarzanie danych w&nbsp;celu obsługi darowizny.
              Szczegóły: <PrivacyPolicyLink black />
            </p>

            {/* `role="alert"` sprawia, że błąd jest odczytany od razu po
                pojawieniu się, bez przenoszenia fokusu. */}
            {stripeError && (
              <p role="alert" className="field-error mt-4 text-center">
                {stripeError}
              </p>
            )}
          </form>
        )}

        {acct && (
          <>
            <div className="my-8 flex items-center gap-4">
              <span className="h-px flex-1 bg-[var(--color-line)]" />
              <span className="muted text-xs font-semibold tracking-wider uppercase">
                lub przelew tradycyjny
              </span>
              <span className="h-px flex-1 bg-[var(--color-line)]" />
            </div>

            <div className="rounded-2xl border p-5 text-center panel-cool">
              <p className="muted text-xs tracking-wide uppercase">Tytuł przelewu</p>
              <p className="mt-1 text-sm">Darowizna na cele statutowe</p>

              <p className="muted mt-4 text-xs tracking-wide uppercase">Numer konta</p>
              <p className="mt-1 flex flex-wrap items-center justify-center gap-2 font-mono text-sm break-all">
                {acct}
                <button
                  type="button"
                  onClick={copy}
                  className="btn btn-ghost px-2 py-1"
                  aria-label={copied ? 'Numer konta skopiowany' : 'Skopiuj numer konta'}
                >
                  {copied ? (
                    <FiCheck aria-hidden="true" className="size-4 text-[var(--color-success)]" />
                  ) : (
                    <FiCopy aria-hidden="true" className="size-4" />
                  )}
                </button>
              </p>

              {/* Komunikat dla czytników ekranu - sama zmiana ikony nie
                  informuje osoby niewidzącej, że kopiowanie się udało. */}
              <span role="status" aria-live="polite" className="sr-only">
                {copied ? 'Skopiowano numer konta' : ''}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
