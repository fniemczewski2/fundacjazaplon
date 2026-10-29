import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { FaDownload, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import Seo from '../components/Seo';
import Page from '../components/Page';
import Loader from '../components/Loader';
import Field from '../components/ui/Field';
import StatementForm, {
  emptyStatementState, statementPayload, statementProblem, statementStateFrom, type StatementState,
} from '../components/agreements/StatementForm';
import { getErrorMessage } from '../lib/utils/errors';
import {
  KIND_LABEL, MAX_KRK_MB, fileToBase64, formatPln,
  publicGet, publicPreview, publicSave, publicSendCode, publicSign,
  type ConsentsInput, type PublicView,
} from '../lib/agreements';

const TOKEN_KEY = 'agreement-token';
const readStoredToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; }
};

type Tri = '' | 'yes' | 'no';
type FormState = {
  infoAck: boolean; marketing: Tri; image: Tri;
  decl: { participation: boolean; rules: boolean; health: boolean };
  rspts: boolean; krkDate: string; krkFile: File | null;
  statement: StatementState;
};
const EMPTY: FormState = {
  infoAck: false, marketing: '', image: '', decl: { participation: false, rules: false, health: false },
  rspts: false, krkDate: '', krkFile: null, statement: emptyStatementState(),
};
const tri = (v: boolean | null | undefined): Tri => (v === true ? 'yes' : v === false ? 'no' : '');

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('.') : '');

function Check({ checked, onChange, children }: Readonly<{ checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }>) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-5 shrink-0 accent-(--color-brand)" />
      <label htmlFor={id} className="cursor-pointer leading-relaxed">{children}</label>
    </div>
  );
}

function Choice({ legend, value, onChange, yes = 'Tak', no = 'Nie' }: Readonly<{ legend: string; value: Tri; onChange: (v: Tri) => void; yes?: string; no?: string }>) {
  const name = useId();
  return (
    <fieldset className="space-y-2">
      <legend className="leading-relaxed">{legend}</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {([['yes', yes], ['no', no]] as const).map(([v, label]) => (
          <label key={v} className="flex cursor-pointer items-center gap-2">
            <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} className="size-5 accent-(--color-brand)" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function StepHeading({ n, children }: Readonly<{ n: number; children: React.ReactNode }>) {
  return (
    <h2 className="font-heading mb-4 flex items-center gap-3 text-xl font-semibold">
      <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm text-white">{n}</span>
      {children}
    </h2>
  );
}

export default function AgreementSign() {
  const params = useParams<{ token?: string }>();
  const [, navigate] = useLocation();
  const [token] = useState(() => params.token ?? readStoredToken());

  // Token z linku trafia do pamięci karty i znika z paska adresu (historia, zrzuty ekranu, analityka).
  useEffect(() => {
    if (!params.token) return;
    try { sessionStorage.setItem(TOKEN_KEY, params.token); } catch { /* tryb prywatny - zostaje w stanie komponentu */ }
    navigate('/umowa', { replace: true });
  }, [params.token, navigate]);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots'; meta.content = 'noindex, nofollow';
    const referrer = document.createElement('meta');
    referrer.name = 'referrer'; referrer.content = 'no-referrer';
    document.head.append(meta, referrer);
    return () => { meta.remove(); referrer.remove(); };
  }, []);

  const [view, setView] = useState<PublicView | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [loadError, setLoadError] = useState('');
  const hydrated = useRef(false);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [code, setCode] = useState('');
  const [accept, setAccept] = useState(false);
  const [sending, setSending] = useState(false);
  const [signing, setSigning] = useState(false);
  const [codeInfo, setCodeInfo] = useState('');
  const [signError, setSignError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewError, setPreviewError] = useState('');

  const reload = useCallback(async () => {
    try {
      setView(await publicGet(token));
      setLoadError('');
    } catch (e) {
      setLoadError(getErrorMessage(e, 'Nie udało się wczytać dokumentów.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) reload();
  }, [token, reload]);

  // Wypełnienie formularza zapisanymi wcześniej odpowiedziami - tylko raz.
  useEffect(() => {
    if (!view || hydrated.current) return;
    hydrated.current = true;
    setForm({
      infoAck: view.consentsSaved, marketing: tri(view.marketingConsent), image: tri(view.consentImage),
      decl: view.declarations ?? { participation: false, rules: false, health: false },
      rspts: view.consentRspts === true, krkDate: view.krkIssueDate ?? '', krkFile: null,
      statement: statementStateFrom(view.statement),
    });
  }, [view]);

  useEffect(() => {
    if (!view) return;
    let url: string | null = null;
    let cancelled = false;
    setPreviewError('');
    publicPreview(token)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      })
      .catch((e) => !cancelled && setPreviewError(getErrorMessage(e, 'Nie udało się wczytać podglądu.')));
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
    // podgląd odświeżamy po zapisie zgód i po podpisie
  }, [view?.status, previewKey, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const patch = (changes: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...changes }));
    setDirty(true);
    setSaveError(''); // komunikat dotyczył poprzedniego stanu formularza
  };

  const mandate = view?.kind === 'mandate';
  const minor = view?.isMinor === true;
  const needsKrk = view?.minorsChecksRequired === true;
  const who = view ? `${view.firstName} ${view.lastName}` : '';
  const relation = view?.guardianRelation ?? 'rodzic';

  const validate = (): string | null => {
    if (!view) return 'Brak danych.';
    if (mandate) {
      const problem = statementProblem(form.statement);
      if (problem) return problem;
      if (!form.statement.truthful) return 'Potwierdź prawdziwość danych w oświadczeniu.';
    } else {
      if (!form.decl.participation || !form.decl.rules || !form.decl.health) return 'Zaznacz wszystkie oświadczenia: zgodę na udział, zapoznanie z regulaminem oraz brak przeciwwskazań zdrowotnych.';
      if (!form.image) return 'Wskaż, czy wyrażasz zgodę na wykorzystanie wizerunku.';
    }
    if (!form.infoAck) return 'Potwierdź zapoznanie się z klauzulą informacyjną.';
    if (!form.marketing) return 'Wskaż, czy wyrażasz zgodę na informowanie o działaniach fundacji (zgoda jest dobrowolna).';
    if (needsKrk) {
      if (!form.rspts) return 'Zgoda na weryfikację w rejestrze jest warunkiem współpracy z małoletnimi.';
      if (!form.krkDate) return 'Podaj datę wystawienia zaświadczenia z KRK.';
      if (!form.krkFile && !view.krkUploaded) return 'Dołącz zaświadczenie z KRK w formacie PDF.';
    }
    return null;
  };

  const handleSave = async () => {
    const problem = validate();
    if (problem) { setSaveError(problem); return; }
    setSaveError('');
    setSaving(true);
    try {
      const payload: ConsentsInput = { infoClauseAck: true, marketingConsent: form.marketing === 'yes' };
      if (mandate) payload.statement = statementPayload({ ...form.statement, truthful: true });
      else { payload.consentImage = form.image === 'yes'; payload.declarations = form.decl; }
      if (needsKrk) {
        payload.consentRspts = true;
        payload.krkIssueDate = form.krkDate;
        if (form.krkFile) payload.krkFileBase64 = await fileToBase64(form.krkFile);
      }
      await publicSave(token, payload);
      setDirty(false);
      setCode(''); setCodeInfo(''); setSignError('');
      setPreviewKey((k) => k + 1);
      await reload();
    } catch (e) {
      setSaveError(getErrorMessage(e, 'Nie udało się zapisać zgód.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSendCode = async () => {
    setSending(true); setSignError(''); setCodeInfo('');
    try {
      await publicSendCode(token);
      setCodeInfo(`Kod wysłaliśmy na adres ${view?.emailMasked}. Jest ważny 10 minut.`);
      setCooldown(60);
    } catch (e) {
      setSignError(getErrorMessage(e, 'Nie udało się wysłać kodu.'));
    } finally {
      setSending(false);
    }
  };

  const handleSign = async () => {
    setSigning(true); setSignError('');
    try {
      await publicSign(token, code.trim());
      setPreviewKey((k) => k + 1);
      await reload();
    } catch (e) {
      setSignError(getErrorMessage(e, 'Nie udało się podpisać dokumentów.'));
    } finally {
      setSigning(false);
    }
  };

  const terms = useMemo(() => {
    if (!view) return [];
    const period = view.endDate ? `${fmtDate(view.startDate)} - ${fmtDate(view.endDate)}` : `od ${fmtDate(view.startDate)}, do czasu rozwiązania`;
    return [
      ['Rodzaj', minor ? `${KIND_LABEL[view.kind]} osoby małoletniej: ${who}` : KIND_LABEL[view.kind]],
      ...(view.contractNumber ? [['Numer umowy', view.contractNumber]] : []),
      ['Zakres', view.scope ?? ''],
      ['Okres', period],
      ...(view.kind === 'mandate' && view.rateGrosze ? [['Wynagrodzenie brutto', `${formatPln(view.rateGrosze)} za godzinę pracy`]] : []),
      ...(view.kind === 'volunteer' && view.costsDescription ? [['Zwrot kosztów', `${view.costsDescription} (rachunek w ciągu ${view.costsDays} dni od poniesienia kosztu)`]] : []),
      ...(view.kind === 'volunteer' && view.healthInsuranceDays !== null ? [['Ubezpieczenie zdrowotne', `w ciągu ${view.healthInsuranceDays} dni od zawarcia porozumienia`]] : []),
    ] as Array<[string, string]>;
  }, [view, minor, who]);

  const previewPane = (
    <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
      {previewUrl ? (
        <>
          <iframe title="Podgląd dokumentów" src={previewUrl} className="hidden h-[75vh] w-full rounded-2xl border bg-white lg:block" />
          <div className="flex flex-wrap gap-2">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              Otwórz dokumenty <FaArrowUpRightFromSquare aria-hidden="true" className="size-3.5" />
            </a>
            <a href={previewUrl} download="dokumenty-zaplon.pdf" className="btn btn-secondary">
              Pobierz PDF <FaDownload aria-hidden="true" className="size-3.5" />
            </a>
          </div>
        </>
      ) : previewError ? (
        <p role="alert" className="field-error">{previewError}</p>
      ) : (
        <Loader />
      )}
    </div>
  );

  return (
    <>
      <Seo title="Dokumenty do podpisu | Fundacja „Zapłon”" description="Dokumenty do podpisania." />

      <Page
        eyebrow="Współpraca"
        title="Dokumenty do podpisu"
        lead="Przeczytaj dokumenty, wypełnij zgody i oświadczenia, a potem podpisz je kodem z wiadomości e-mail."
        illustration="notes"
      >
        {!token && (
          <p className="muted">Otwórz ponownie link z wiadomości e-mail od fundacji. Link jest osobisty i wygasa po kilkunastu dniach.</p>
        )}
        {token && loading && <Loader />}
        {token && !loading && loadError && !view && <p role="alert" className="field-error">{loadError}</p>}

        {view && (
          <div className="space-y-8">
            {!view.templatesApproved && (
              <p role="note" className="rounded-2xl border border-danger p-4 text-sm text-danger">
                Wzór roboczy. Dokumenty mają znak wodny „WERSJA ROBOCZA” i nie zostały jeszcze zatwierdzone przez fundację.
              </p>
            )}

            {view.status === 'approved' && (
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                  <section className="card p-5 md:p-6" aria-labelledby="terms-h">
                    <h2 id="terms-h" className="font-heading mb-3 text-xl font-semibold">Twoja współpraca</h2>
                    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
                      {terms.map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="muted">{k}</dt>
                          <dd className="break-words">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="muted mt-3 text-sm lg:hidden">Dokumenty otworzysz przyciskiem pod formularzem.</p>
                  </section>

                  <section className="card space-y-5 p-5 md:p-6" aria-labelledby="consents-h">
                    <h2 id="consents-h" className="sr-only">Zgody i oświadczenia</h2>
                    <StepHeading n={1}>Zgody i oświadczenia</StepHeading>

                    {!mandate && (
                      <div className="space-y-4">
                        <h3 className="font-heading text-lg font-semibold">{minor ? 'Zgoda wolontariacka rodzica / opiekuna prawnego' : 'Zgoda wolontariacka'}</h3>
                        <Check checked={form.decl.participation} onChange={(v) => patch({ decl: { ...form.decl, participation: v } })}>
                          {minor
                            ? `Jako ${relation} wyrażam zgodę na udział małoletniego ${who} w pracach wolontariackich na rzecz Fundacji „Zapłon”.`
                            : 'Wyrażam zgodę na udział w pracach wolontariackich na rzecz Fundacji „Zapłon”.'}
                        </Check>
                        <Check checked={form.decl.rules} onChange={(v) => patch({ decl: { ...form.decl, rules: v } })}>
                          {minor
                            ? 'Zapoznałem/am się z charakterem działań fundacji, regulaminem wolontariatu i akceptuję fakt, że świadczenia wykonywane przez małoletniego mają charakter nieodpłatny, dobrowolny i społeczny.'
                            : 'Zapoznałem/am się z charakterem działań fundacji, regulaminem wolontariatu i akceptuję fakt, że wykonywane przeze mnie świadczenia mają charakter nieodpłatny, dobrowolny i społeczny.'}
                          {' '}<a href="/dokumenty" target="_blank" rel="noopener noreferrer" className="link-accent underline">Regulamin wolontariatu</a>
                        </Check>
                        <Check checked={form.decl.health} onChange={(v) => patch({ decl: { ...form.decl, health: v } })}>
                          {minor
                            ? 'Nie ma przeciwwskazań zdrowotnych do wykonywania przez małoletniego czynności w ramach wolontariatu. O wszelkich istotnych problemach zdrowotnych (alergie, choroby przewlekłe) poinformowałem/am koordynatora wolontariatu.'
                            : 'Nie ma przeciwwskazań zdrowotnych do wykonywania przeze mnie czynności w ramach wolontariatu. O wszelkich istotnych problemach zdrowotnych (alergie, choroby przewlekłe) poinformowałem/am koordynatora wolontariatu.'}
                        </Check>
                        <Choice
                          legend={`Zgoda na wykorzystanie wizerunku${minor ? ' małoletniego' : ''} (art. 81 ust. 1 ustawy o prawie autorskim i prawach pokrewnych) na nieodpłatne utrwalanie, wykorzystanie i rozpowszechnianie przez Fundację „Zapłon” w celach informacyjnych i promocyjnych, bez ograniczeń czasowych i terytorialnych. Zgoda jest dobrowolna i można ją wycofać.`}
                          value={form.image} onChange={(v) => patch({ image: v })} yes="Wyrażam zgodę" no="Nie wyrażam zgody"
                        />
                      </div>
                    )}

                    {mandate && (
                      <div className="space-y-4 rounded-2xl border p-4 panel-cool">
                        <h3 className="font-heading text-lg font-semibold">Oświadczenie zleceniobiorcy</h3>
                        <StatementForm value={form.statement} onChange={(v) => patch({ statement: v })} />
                        <Check checked={form.statement.truthful} onChange={(v) => patch({ statement: { ...form.statement, truthful: v } })}>
                          Oświadczam, że wszystkie podane przeze mnie dane są zgodne z prawdą i stanem faktycznym. Zobowiązuję się do niezwłocznego poinformowania Fundacji „Zapłon” o wszelkich zmianach tych danych.
                        </Check>
                      </div>
                    )}

                    <div className="space-y-4">
                      <h3 className="font-heading text-lg font-semibold">Dane osobowe</h3>
                      <Check checked={form.infoAck} onChange={(v) => patch({ infoAck: v })}>
                        Zapoznałem/am się z Klauzulą Informacyjną dotyczącą przetwarzania danych osobowych przez Fundację „Zapłon” (jest w dokumentach po prawej stronie).
                      </Check>
                      <Choice
                        legend={`Zgoda na przetwarzanie ${minor ? 'adresu e-mail rodzica / opiekuna prawnego' : 'mojego adresu e-mail'} w celu informowania o bieżącej działalności, wydarzeniach, akcjach i projektach Fundacji. Jest w pełni dobrowolna i można ją w każdej chwili wycofać (opcjonalna).`}
                        value={form.marketing} onChange={(v) => patch({ marketing: v })} yes="Wyrażam zgodę" no="Nie wyrażam zgody"
                      />
                    </div>

                    {needsKrk && (
                      <div className="space-y-4 rounded-2xl border p-4 panel-cool">
                        <h3 className="font-heading text-lg font-semibold">Ochrona małoletnich</h3>
                        <p className="text-sm leading-relaxed">
                          Twoja współpraca obejmuje bezpośrednią pracę z małoletnimi, więc warunkiem dopuszczenia do aktywności jest przedstawienie zaświadczenia o niekaralności z Krajowego Rejestru Karnego oraz weryfikacja w Rejestrze Sprawców Przestępstw na Tle Seksualnym.
                        </p>
                        <Check checked={form.rspts} onChange={(v) => patch({ rspts: v })}>
                          Wyrażam zgodę na sprawdzenie moich danych w Rejestrze Sprawców Przestępstw na Tle Seksualnym.
                        </Check>
                        <Field label="Data wystawienia zaświadczenia z KRK">
                          {(a) => <input {...a} type="date" value={form.krkDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => patch({ krkDate: e.target.value })} className="input-text sm:max-w-xs" />}
                        </Field>
                        <Field label="Zaświadczenie z KRK (PDF)" hint={view.krkUploaded && !form.krkFile ? `Plik jest już dołączony${view.krkIssueDate ? ` (z dnia ${fmtDate(view.krkIssueDate)})` : ''}. Możesz go zastąpić nowym. Maks. ${MAX_KRK_MB} MB.` : `Tylko PDF, maks. ${MAX_KRK_MB} MB.`}>
                          {(a) => (
                            <input
                              {...a} type="file" accept="application/pdf,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                if (file && (file.size > MAX_KRK_MB * 1024 * 1024 || !/\.pdf$/i.test(file.name))) {
                                  setSaveError(`Plik KRK musi być dokumentem PDF do ${MAX_KRK_MB} MB.`);
                                  e.target.value = '';
                                  return;
                                }
                                setSaveError('');
                                patch({ krkFile: file });
                              }}
                              className="input-text cursor-pointer file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                            />
                          )}
                        </Field>
                      </div>
                    )}

                    {saveError && <p role="alert" className="field-error">{saveError}</p>}
                    <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary w-full sm:w-auto">
                      {saving ? 'Zapisujemy…' : view.consentsSaved && !dirty ? 'Zapisano, zapisz ponownie' : 'Zapisz i zaktualizuj dokumenty'}
                    </button>
                    {view.consentsSaved && !dirty && <p className="field-hint">Dokumenty po prawej stronie zawierają Twoje odpowiedzi.</p>}
                  </section>

                  <section className="card space-y-4 p-5 md:p-6" aria-labelledby="sign-h">
                    <h2 id="sign-h" className="sr-only">Podpis</h2>
                    <StepHeading n={2}>Podpis</StepHeading>

                    {!view.consentsSaved || dirty ? (
                      <p className="muted">Zapisz zgody i oświadczenia, a potem podpiszesz dokumenty kodem z wiadomości e-mail.</p>
                    ) : (
                      <>
                        <p className="leading-relaxed">
                          Przeczytaj dokumenty. Żeby je podpisać, zamów kod: wyślemy go na adres {view.emailMasked}.
                        </p>
                        <button type="button" onClick={handleSendCode} disabled={sending || cooldown > 0} className="btn btn-secondary">
                          {sending ? 'Wysyłamy…' : cooldown > 0 ? `Nowy kod za ${cooldown} s` : view.otpSentAt || codeInfo ? 'Wyślij kod ponownie' : 'Wyślij kod'}
                        </button>
                        {codeInfo && <p role="status" className="field-hint">{codeInfo}</p>}

                        <Field label="Kod z wiadomości e-mail">
                          {(a) => <input {...a} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replaceAll(/\D/g, ''))} className="input-text font-mono tracking-widest sm:max-w-[12rem]" />}
                        </Field>
                        <Check checked={accept} onChange={setAccept}>
                          {minor ? `Zapoznałem/am się z dokumentami i podpisuję je jako ${relation} w imieniu małoletniego ${who}. Rozumiem, że kod z wiadomości e-mail jest moim podpisem elektronicznym.` : 'Zapoznałem/am się z dokumentami i podpisuję je. Rozumiem, że kod z wiadomości e-mail jest moim podpisem elektronicznym.'}
                        </Check>
                        {signError && <p role="alert" className="field-error">{signError}</p>}
                        <button type="button" onClick={handleSign} disabled={signing || code.length !== 6 || !accept} className="btn btn-ember w-full sm:w-auto">
                          {signing ? 'Podpisujemy…' : 'Podpisz dokumenty'}
                        </button>
                      </>
                    )}
                  </section>
                </div>

                {previewPane}
              </div>
            )}

            {(view.status === 'signed' || view.status === 'completed') && (
              <div className="grid gap-8 lg:grid-cols-2">
                <output className="card block space-y-3 p-6">
                  <p className="font-heading text-2xl font-semibold">
                    {view.status === 'completed' ? 'Dokumenty są podpisane przez obie strony' : 'Podpisałeś/aś dokumenty'}
                  </p>
                  <p className="lead">
                    {view.status === 'completed'
                      ? 'Poniżej możesz je pobrać. Link jest osobisty i wygasa, a na prośbę fundacja wyśle nowy.'
                      : `Dziękujemy. Teraz podpisze je fundacja${view.minorsChecksRequired ? ' po zakończeniu weryfikacji' : ''}. Gdy to nastąpi, dostaniesz e-mail z gotowymi dokumentami.`}
                  </p>
                </output>
                {previewPane}
              </div>
            )}

            {view.status === 'rejected' && <p className="muted">To zgłoszenie zostało zamknięte.</p>}
          </div>
        )}
      </Page>
    </>
  );
}
