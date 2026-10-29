import { useRef, useState } from 'react';
import { FaPaperPlane } from 'react-icons/fa6';
import Seo from '../components/Seo';
import Page from '../components/Page';
import PrivacyPolicyLink from '../components/PrivacyPolicyLink';
import Field from '../components/ui/Field';
import { getErrorMessage } from '../lib/utils/errors';
import {
  KIND_LABEL,
  ageFromPesel,
  submitApplication,
  validateApplication,
  type AgreementKind,
  type ApplicationErrors,
  type ApplicationInput,
} from '../lib/agreements';

const EMPTY: ApplicationInput = {
  kind: 'volunteer', firstName: '', lastName: '', email: '', phone: '', pesel: '',
  street: '', houseNumber: '', postalCode: '', city: '', note: '',
  guardian: { firstName: '', lastName: '', email: '', phone: '', relation: '' },
};

const KINDS: ReadonlyArray<{ value: AgreementKind; hint: string }> = [
  { value: 'volunteer', hint: 'Nieodpłatnie, na podstawie porozumienia wolontariackiego.' },
  { value: 'mandate', hint: 'Płatnie, na podstawie umowy zlecenie.' },
];

export default function Agreement() {
  const [form, setForm] = useState<ApplicationInput>(EMPTY);
  const [trap, setTrap] = useState(''); // honeypot - człowiek go nie widzi
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setGuardian = (key: keyof ApplicationInput['guardian'], value: string) =>
    setForm((f) => ({ ...f, guardian: { ...f.guardian, [key]: value } }));

  // Osoba niepełnoletnia (wiek z PESEL): wolontariat za zgodą rodzica lub opiekuna prawnego, bez umowy zlecenie.
  const age = ageFromPesel(form.pesel);
  const isMinor = age !== null && age < 18;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;

    const found = validateApplication(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    setStatus('loading');
    setServerError('');
    try {
      await submitApplication(form, trap);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setServerError(getErrorMessage(err, 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.'));
    }
  };

  return (
    <>
      <Seo
        title="Dołącz do zespołu | Fundacja „Zapłon”"
        description="Zgłoszenie do współpracy z Fundacją „Zapłon” jako wolontariusz lub zleceniobiorca."
      />

      <Page
        eyebrow="Współpraca"
        title="Dołącz do zespołu"
        lead="Zostaw dane. Po akceptacji zgłoszenia wyślemy Ci e-mailem dokumenty do podpisania, bez drukowania i skanowania."
        illustration="zapalki"
        width="prose"
      >
        {status === 'success' ? (
          <output className="card block p-6 text-center md:p-8">
            <p className="font-heading text-2xl font-semibold">Zgłoszenie wysłane</p>
            <p className="lead mt-3">
              Rozpatrzymy je i odpiszemy na podany adres e-mail. Po akceptacji dostaniesz link do dokumentów.
            </p>
          </output>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} noValidate className="card relative space-y-6 p-6 md:p-8">
            <fieldset>
              <legend className="field-label">Rodzaj współpracy</legend>
              <div className="mt-1 grid gap-3 sm:grid-cols-2">
                {KINDS.map((k) => {
                  const active = form.kind === k.value;
                  const blocked = isMinor && k.value === 'mandate';
                  return (
                    <button
                      key={k.value}
                      type="button"
                      aria-pressed={active}
                      disabled={blocked}
                      onClick={() => set('kind', k.value)}
                      className={`rounded-2xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        active ? 'border-brand bg-surface-cool' : 'border-line-strong hover:border-brand-ink'
                      }`}
                    >
                      <span className="font-heading block text-lg font-semibold">{KIND_LABEL[k.value]}</span>
                      <span className="muted block text-sm">{blocked ? 'Dostępne dla osób pełnoletnich.' : k.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Imię" error={errors.firstName}>
                {(a) => <input {...a} type="text" autoComplete="given-name" maxLength={100} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className="input-text" />}
              </Field>
              <Field label="Nazwisko" error={errors.lastName}>
                {(a) => <input {...a} type="text" autoComplete="family-name" maxLength={100} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className="input-text" />}
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Adres e-mail" error={errors.email} hint="Na ten adres wyślemy dokumenty i kod do podpisu.">
                {(a) => <input {...a} type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(e) => set('email', e.target.value)} className="input-text" />}
              </Field>
              <Field label="Telefon (opcjonalnie)" error={errors.phone}>
                {(a) => <input {...a} type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input-text" />}
              </Field>
            </div>

            <Field label="PESEL" error={errors.pesel} hint="Potrzebny do umowy i rozliczeń. Na jego podstawie sprawdzamy wiek.">
              {(a) => <input {...a} type="text" inputMode="numeric" autoComplete="off" maxLength={11} value={form.pesel} onChange={(e) => set('pesel', e.target.value.replaceAll(/\D/g, ''))} className="input-text font-mono sm:max-w-xs" />}
            </Field>

            <div className="grid gap-5 sm:grid-cols-[1fr_11rem]">
              <Field label="Ulica" error={errors.street}>
                {(a) => <input {...a} type="text" autoComplete="address-line1" maxLength={150} value={form.street} onChange={(e) => set('street', e.target.value)} className="input-text" />}
              </Field>
              <Field label="Numer domu/lokalu" error={errors.houseNumber}>
                {(a) => <input {...a} type="text" autoComplete="off" maxLength={20} value={form.houseNumber} onChange={(e) => set('houseNumber', e.target.value)} className="input-text" />}
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
              <Field label="Kod pocztowy" error={errors.postalCode}>
                {(a) => <input {...a} type="text" inputMode="numeric" autoComplete="postal-code" placeholder="00-000" maxLength={6} value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} className="input-text" />}
              </Field>
              <Field label="Miejscowość" error={errors.city}>
                {(a) => <input {...a} type="text" autoComplete="address-level2" maxLength={100} value={form.city} onChange={(e) => set('city', e.target.value)} className="input-text" />}
              </Field>
            </div>

            {isMinor && (
              <fieldset className="space-y-5 rounded-2xl border p-4 panel-cool md:p-5">
                <legend className="font-heading px-2 text-lg font-semibold">Rodzic lub opiekun prawny</legend>
                <p className="text-sm leading-relaxed">
                  Wolontariat osoby niepełnoletniej wymaga zgody rodzica lub opiekuna prawnego. To on dostanie dokumenty, wypełni zgody i podpisze je kodem z wiadomości e-mail.
                </p>
                <Field label="Kim jest osoba składająca zgodę?" error={errors.guardianRelation}>
                  {(a) => (
                    <select {...a} value={form.guardian.relation} onChange={(e) => setGuardian('relation', e.target.value)} className="input-text sm:max-w-xs">
                      <option value="">Wybierz</option>
                      <option value="rodzic">Rodzic</option>
                      <option value="opiekun prawny">Opiekun prawny</option>
                    </select>
                  )}
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Imię rodzica lub opiekuna" error={errors.guardianFirstName}>
                    {(a) => <input {...a} type="text" autoComplete="off" maxLength={100} value={form.guardian.firstName} onChange={(e) => setGuardian('firstName', e.target.value)} className="input-text" />}
                  </Field>
                  <Field label="Nazwisko rodzica lub opiekuna" error={errors.guardianLastName}>
                    {(a) => <input {...a} type="text" autoComplete="off" maxLength={100} value={form.guardian.lastName} onChange={(e) => setGuardian('lastName', e.target.value)} className="input-text" />}
                  </Field>
                  <Field label="E-mail rodzica lub opiekuna" error={errors.guardianEmail} hint="Na ten adres wyślemy dokumenty i kod do podpisu.">
                    {(a) => <input {...a} type="email" autoComplete="off" maxLength={254} value={form.guardian.email} onChange={(e) => setGuardian('email', e.target.value)} className="input-text" />}
                  </Field>
                  <Field label="Telefon rodzica lub opiekuna" error={errors.guardianPhone}>
                    {(a) => <input {...a} type="tel" autoComplete="off" maxLength={30} value={form.guardian.phone} onChange={(e) => setGuardian('phone', e.target.value)} className="input-text" />}
                  </Field>
                </div>
              </fieldset>
            )}

            <Field label="Czym chcesz się zająć? (opcjonalnie)" error={errors.note} hint="Doświadczenie, dostępność, obszar działań. Pomoże nam ustalić zakres.">
              {(a) => <textarea {...a} rows={4} maxLength={1000} value={form.note} onChange={(e) => set('note', e.target.value)} className="input-textarea" />}
            </Field>

            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="agreement-website">Nie wypełniaj tego pola</label>
              <input id="agreement-website" type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
            </div>

            {status === 'error' && <p role="alert" className="field-error">{serverError}</p>}

            <button type="submit" disabled={status === 'loading'} className="btn btn-ember w-full">
              {status === 'loading' ? 'Wysyłamy…' : <>Wyślij zgłoszenie <FaPaperPlane aria-hidden="true" /></>}
            </button>

            <p className="field-hint text-center leading-relaxed">
              Dane przetwarzamy w celu rozpatrzenia zgłoszenia i zawarcia umowy. Pełną klauzulę informacyjną dostaniesz razem z dokumentami. Szczegóły: <PrivacyPolicyLink black />
            </p>
          </form>
        )}
      </Page>
    </>
  );
}
