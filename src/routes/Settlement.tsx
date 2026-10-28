import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { FaPaperPlane } from 'react-icons/fa6';
import Seo from '../components/Seo';
import Page from '../components/Page';
import PrivacyPolicyLink from '../components/PrivacyPolicyLink';
import { getErrorMessage } from '../lib/utils/errors';
import {
  formatIban,
  looksLikePdf,
  submitSettlement,
  validateSettlement,
  MAX_INVOICE_SIZE_MB,
  type FieldErrors,
  type InvoiceKind,
} from '../lib/settlements';

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  children: (a11y: {
    id: string;
    'aria-invalid': boolean | undefined;
    'aria-describedby': string | undefined;
  }) => ReactNode;
};

function Field({ label, error, hint, children }: Readonly<FieldProps>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {hint && (
        <p id={hintId} className="field-hint mt-1">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

export default function Settlement() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [iban, setIban] = useState('');
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<InvoiceKind>('pdf');
  const [file, setFile] = useState<File | null>(null);
  const [ksef, setKsef] = useState('');
  const [trap, setTrap] = useState(''); // honeypot - człowiek go nie widzi

  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  const formRef = useRef<HTMLFormElement>(null);
  const kindLabelId = useId();
  const trapId = useId();

  // Formularz wewnętrzny - nie ma być w wynikach wyszukiwania.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const focusFirstInvalid = () =>
    requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
    );

  const reset = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPurpose('');
    setIban('');
    setAmount('');
    setKind('pdf');
    setFile(null);
    setKsef('');
    setErrors({});
    setServerError('');
    setStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;

    const input = { firstName, lastName, email, purpose, iban, amount, kind, file, ksef };
    const found = validateSettlement(input);

    if (!found.invoice && kind === 'pdf' && file && !(await looksLikePdf(file))) {
      found.invoice = 'Plik nie jest prawidłowym dokumentem PDF.';
    }

    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstInvalid();
      return;
    }

    // Wypełnione pole pułapka = bot. Udajemy sukces, nic nie wysyłamy.
    if (trap) {
      setStatus('success');
      return;
    }

    setStatus('loading');
    setServerError('');
    try {
      await submitSettlement(input);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setServerError(getErrorMessage(err, 'Nie udało się wysłać rozliczenia. Spróbuj ponownie.'));
    }
  };

  return (
    <>
      <Seo
        title="Rozliczenie faktury | Fundacja „Zapłon”"
        description="Formularz rozliczenia wydatku dla osób współpracujących z Fundacją „Zapłon”."
      />

      <Page
        eyebrow="Dla zespołu"
        title="Rozliczenie faktury"
        lead="Wypełnij formularz i dołącz fakturę. Zwrot realizujemy po weryfikacji dokumentu."
        illustration="koperta"
        width="prose"
      >
        {status === 'success' ? (
          <output className="card block p-6 text-center md:p-8">
            <p className="font-heading text-2xl font-semibold">Rozliczenie wysłane</p>
            <p className="lead mt-3">
              Sprawdzimy dokument i dane przelewu. Decyzję wyślemy na podany adres e-mail.
            </p>
            <button type="button" onClick={reset} className="btn btn-primary mt-6">
              Dodaj kolejną fakturę
            </button>
          </output>
        ) : (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            noValidate
            className="card relative space-y-6 p-6 md:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Imię" error={errors.firstName}>
                {(a) => (
                  <input
                    {...a}
                    type="text"
                    autoComplete="given-name"
                    maxLength={100}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-text"
                  />
                )}
              </Field>

              <Field label="Nazwisko" error={errors.lastName}>
                {(a) => (
                  <input
                    {...a}
                    type="text"
                    autoComplete="family-name"
                    maxLength={100}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-text"
                  />
                )}
              </Field>
            </div>

            <Field
              label="Adres e-mail"
              error={errors.email}
              hint="Wyślemy na niego decyzję w sprawie rozliczenia."
            >
              {(a) => (
                <input
                  {...a}
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-text"
                />
              )}
            </Field>

            <Field
              label="Cel wydatku"
              error={errors.purpose}
              hint="Np. projekt, wydarzenie lub zadanie, którego dotyczy zakup."
            >
              {(a) => (
                <textarea
                  {...a}
                  rows={3}
                  maxLength={500}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="input-textarea"
                />
              )}
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Numer konta do zwrotu"
                error={errors.iban}
                hint="Polski rachunek, 26 cyfr. Prefiks PL jest opcjonalny."
              >
                {(a) => (
                  <input
                    {...a}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    onBlur={() => iban.trim() && setIban(formatIban(iban))}
                    className="input-text font-mono"
                  />
                )}
              </Field>

              <Field label="Kwota brutto (zł)" error={errors.amount}>
                {(a) => (
                  <input
                    {...a}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-text"
                  />
                )}
              </Field>
            </div>

            <div>
              <p id={kindLabelId} className="field-label">
                Dokument
              </p>
              <fieldset
                aria-labelledby={kindLabelId}
                className="mb-4 flex rounded-full border p-1 panel-cool"
              >
                {(
                  [
                    { value: 'pdf', label: 'Plik PDF' },
                    { value: 'ksef', label: 'Numer KSeF' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={kind === opt.value}
                    onClick={() => {
                      setKind(opt.value);
                      setErrors((s) => ({ ...s, invoice: undefined }));
                    }}
                    className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors ${
                      kind === opt.value ? 'bg-brand text-white' : 'text-ink hover:text-ember-ink'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </fieldset>

              {kind === 'pdf' ? (
                <Field
                  label="Faktura w PDF"
                  error={errors.invoice}
                  hint={`Tylko PDF, maks. ${MAX_INVOICE_SIZE_MB} MB.`}
                >
                  {(a) => (
                    <input
                      {...a}
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="input-text cursor-pointer file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                    />
                  )}
                </Field>
              ) : (
                <Field
                  label="Numer KSeF faktury"
                  error={errors.invoice}
                  hint="35 znaków, np. 1234567890-20260101-ABCDEF123456-AB."
                >
                  {(a) => (
                    <input
                      {...a}
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      value={ksef}
                      onChange={(e) => setKsef(e.target.value.toUpperCase())}
                      className="input-text font-mono"
                    />
                  )}
                </Field>
              )}
            </div>

            {/* Honeypot: poza ekranem, pominięty przez klawiaturę i czytniki ekranu. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor={trapId}>Nie wypełniaj tego pola</label>
              <input
                id={trapId}
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={trap}
                onChange={(e) => setTrap(e.target.value)}
              />
            </div>

            {status === 'error' && (
              <p role="alert" className="field-error">
                {serverError}
              </p>
            )}

            <button type="submit" disabled={status === 'loading'} className="btn btn-ember w-full">
              {status === 'loading' ? (
                'Wysyłamy…'
              ) : (
                <>
                  Wyślij rozliczenie <FaPaperPlane aria-hidden="true" />
                </>
              )}
            </button>

            <p className="field-hint text-center leading-relaxed">
              Dane (imię, nazwisko, adres e-mail, numer konta) przetwarzamy w celu zwrotu wydatku i rozliczenia
              fundacji. Szczegóły: <PrivacyPolicyLink black />
            </p>
          </form>
        )}
      </Page>
    </>
  );
}
