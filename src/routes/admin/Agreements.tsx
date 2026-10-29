// src/routes/admin/Agreements.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { FiCheck, FiCircle, FiCopy } from 'react-icons/fi';
import { FaArrowLeft, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import Loader from '../../components/Loader';
import Modal from '../../components/Modal';
import Page from '../../components/Page';
import Field from '../../components/ui/Field';
import { useConfirm, useToast } from '../../components/ui/Feedback';
import { getErrorMessage } from '../../lib/utils/errors';
import { supabase } from '../../lib/supabase';
import {
  KIND_LABEL, adminAction, adminPreview, formatPln, getKrkUrl, listAgreements, listEvents, parseAmountToGrosze,
  type AdminAction, type AdminResult, type AgreementEvent, type AgreementRow, type AgreementStatus, type TermsInput,
} from '../../lib/agreements';

type Filter = AgreementStatus | 'all';
const FILTERS: ReadonlyArray<{ key: Filter; label: string }> = [
  { key: 'submitted', label: 'Nowe' },
  { key: 'approved', label: 'U wnioskodawcy' },
  { key: 'signed', label: 'Do podpisu fundacji' },
  { key: 'completed', label: 'Zakończone' },
  { key: 'rejected', label: 'Odrzucone' },
  { key: 'all', label: 'Wszystkie' },
];

const STATUS_LABEL: Record<AgreementStatus, string> = {
  submitted: 'nowe', approved: 'u wnioskodawcy', signed: 'do podpisu fundacji', completed: 'zakończone', rejected: 'odrzucone',
};
const STATUS_CLASS: Record<AgreementStatus, string> = {
  submitted: 'bg-surface-warm text-ember-ink', approved: 'bg-surface-cool text-brand-ink', signed: 'bg-surface-warm text-ember-ink',
  completed: 'bg-surface-cool text-success', rejected: 'bg-surface-cool text-danger',
};
const LABEL = 'muted text-xs tracking-wide uppercase';
const REP_KEY = 'agreements.reps';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pl-PL') : '');
const fmtDay = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('.') : '...');
const today = () => new Date().toISOString().slice(0, 10);

type Dialog =
  | { type: 'approve'; row: AgreementRow }
  | { type: 'reject'; row: AgreementRow }
  | { type: 'link'; link: string; email: string }
  | { type: 'history'; row: AgreementRow; events: AgreementEvent[] | null };

type TermsForm = {
  conclusionPlace: string; scope: string; startDate: string; endDate: string; minors: boolean;
  repName: string; repRole: string; repEmail: string; rep2Name: string; rep2Role: string; rep2Email: string;
  contractNumber: string; amount: string; costsDescription: string; costsDays: string; healthDays: string;
};

type Reps = Pick<TermsForm, 'repName' | 'repRole' | 'repEmail' | 'rep2Name' | 'rep2Role' | 'rep2Email'>;
const readReps = (): Reps => {
  const empty: Reps = { repName: '', repRole: '', repEmail: '', rep2Name: '', rep2Role: '', rep2Email: '' };
  try { return { ...empty, ...(JSON.parse(localStorage.getItem(REP_KEY) ?? '{}') as Partial<Reps>) }; } catch { return empty; }
};

function CopyButton({ value, label }: Readonly<{ value: string; label: string }>) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch (e) { console.error('Nie udało się skopiować wartości', e); }
  };
  return (
    <button type="button" onClick={copy} aria-label={copied ? `Skopiowano: ${label}` : `Skopiuj: ${label}`}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-cool">
      {copied ? <FiCheck aria-hidden="true" className="size-4 text-success" /> : <FiCopy aria-hidden="true" className="size-4" />}
    </button>
  );
}

function Step({ done, children }: Readonly<{ done: boolean; children: React.ReactNode }>) {
  return (
    <li className={`flex items-center gap-2 ${done ? '' : 'muted'}`}>
      {done ? <FiCheck aria-hidden="true" className="size-4 shrink-0 text-success" /> : <FiCircle aria-hidden="true" className="size-4 shrink-0" />}
      <span>{children}</span>
      <span className="sr-only">{done ? ' (zrobione)' : ' (do zrobienia)'}</span>
    </li>
  );
}

export default function AdminAgreements() {
  const toast = useToast();
  const confirm = useConfirm();

  const [rows, setRows] = useState<AgreementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('submitted');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [me, setMe] = useState('');
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setMe((data.session?.user.email ?? '').toLowerCase()));
  }, []);

  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dialogError, setDialogError] = useState('');
  const [dialogBusy, setDialogBusy] = useState(false);
  const busyRef = useRef(false);
  const [note, setNote] = useState('');
  const [terms, setTerms] = useState<TermsForm | null>(null);

  const refresh = useCallback(async () => {
    try { setLoading(true); setErr(null); setRows(await listAgreements()); }
    catch (e) { setErr(getErrorMessage(e, 'Błąd pobierania danych.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { submitted: 0, approved: 0, signed: 0, completed: 0, rejected: 0, all: rows.length };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);
  const visible = useMemo(() => rows.filter((r) => filter === 'all' || r.status === filter), [rows, filter]);

  // Stabilna funkcja - Modal rejestruje efekt zależny od `onClose` (inaczej fokus uciekałby z pola tekstowego).
  const closeDialog = useCallback(() => { if (!busyRef.current) setDialog(null); }, []);

  const reportResult = (result: AdminResult, ok: string) => {
    if (result.emailSent === false) {
      toast(`${ok}, ale e-mail NIE został wysłany: ${result.emailError ?? 'nieznany błąd'}`, 'error');
    } else {
      toast(result.emailSent ? `${ok}. E-mail wysłano.` : ok, 'success');
    }
  };

  const run = async (row: AgreementRow, action: AdminAction, ok: string, extra?: Record<string, unknown>) => {
    setBusyId(row.id);
    try {
      const result = await adminAction(row.id, action, extra);
      reportResult(result, ok);
      if (result.link) setDialog({ type: 'link', link: result.link, email: row.email });
      await refresh();
    } catch (e) {
      toast(getErrorMessage(e, 'Nie udało się wykonać operacji.'), 'error');
      await refresh();
    } finally { setBusyId(null); }
  };

  const openWindow = async (load: () => Promise<string>) => {
    // Okno otwieramy synchronicznie z kliknięcia - po `await` blokują je przeglądarki.
    const popup = window.open('about:blank', '_blank');
    try {
      const url = await load();
      if (popup) { popup.opener = null; popup.location.href = url; }
      else toast('Przeglądarka zablokowała nowe okno. Zezwól na wyskakujące okna dla tej strony.', 'error');
    } catch (e) { popup?.close(); toast(getErrorMessage(e, 'Nie udało się otworzyć pliku.'), 'error'); }
  };
  const openPdf = (row: AgreementRow) => openWindow(async () => {
    const url = URL.createObjectURL(await adminPreview(row.id));
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return url;
  });
  const openKrk = (row: AgreementRow) => row.krk_file_path && openWindow(() => getKrkUrl(row.krk_file_path as string));

  const openApprove = (row: AgreementRow) => {
    setDialogError(''); setNote('');
    setTerms({
      conclusionPlace: '', scope: '', startDate: today(), endDate: '', minors: false, ...readReps(),
      contractNumber: '', amount: '', costsDescription: '', costsDays: '14', healthDays: '7',
    });
    setDialog({ type: 'approve', row });
  };
  const openReject = (row: AgreementRow) => { setDialogError(''); setNote(''); setDialog({ type: 'reject', row }); };
  const openHistory = async (row: AgreementRow) => {
    setDialog({ type: 'history', row, events: null });
    try { setDialog({ type: 'history', row, events: await listEvents(row.id) }); }
    catch (e) { toast(getErrorMessage(e, 'Nie udało się pobrać historii.'), 'error'); setDialog(null); }
  };

  const submitDialog = async () => {
    if (!dialog || busyRef.current) return;
    let extra: Record<string, unknown> = {};
    let action: AdminAction;
    let ok: string;

    if (dialog.type === 'approve' && terms) {
      const mandate = dialog.row.kind === 'mandate';
      const rate = mandate ? parseAmountToGrosze(terms.amount) : null;
      if (terms.conclusionPlace.trim().length < 2) return setDialogError('Podaj miejscowość zawarcia umowy.');
      if (terms.scope.trim().length < 3) return setDialogError('Opisz zakres zadań.');
      if (!terms.startDate) return setDialogError('Podaj datę rozpoczęcia.');
      if (mandate && !terms.endDate) return setDialogError('Dla umowy zlecenie podaj datę zakończenia.');
      if (mandate && !terms.contractNumber.trim()) return setDialogError('Podaj numer umowy zlecenia.');
      if (mandate && !rate) return setDialogError('Podaj stawkę godzinową w formacie 45,00.');
      if (!mandate && terms.costsDescription.trim().length < 3) return setDialogError('Opisz, w jaki sposób fundacja pokrywa koszty wolontariusza (§ 5 ust. 1).');
      if ([terms.repName, terms.rep2Name].some((v) => v.trim().length < 3) || [terms.repRole, terms.rep2Role].some((v) => v.trim().length < 2)) return setDialogError('Podaj dwie osoby reprezentujące fundację wraz z funkcjami.');
      if (![terms.repEmail, terms.rep2Email].every((v) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v.trim()))) return setDialogError('Podaj adresy e-mail kont administratora obu osób.');

      const t: TermsInput = {
        conclusionPlace: terms.conclusionPlace.trim(), scope: terms.scope.trim(), startDate: terms.startDate, endDate: terms.endDate,
        minorsChecksRequired: terms.minors && !dialog.row.is_minor,
        repName: terms.repName.trim(), repRole: terms.repRole.trim(), repEmail: terms.repEmail.trim().toLowerCase(),
        rep2Name: terms.rep2Name.trim(), rep2Role: terms.rep2Role.trim(), rep2Email: terms.rep2Email.trim().toLowerCase(),
        ...(mandate
          ? { contractNumber: terms.contractNumber.trim(), rateGrosze: rate ?? 0 }
          : { costsDescription: terms.costsDescription.trim(), costsDays: Number(terms.costsDays), healthInsuranceDays: Number(terms.healthDays) }),
      };
      try {
        localStorage.setItem(REP_KEY, JSON.stringify({ repName: t.repName, repRole: t.repRole, repEmail: t.repEmail, rep2Name: t.rep2Name, rep2Role: t.rep2Role, rep2Email: t.rep2Email }));
      } catch { /* ignorujemy */ }
      extra = { terms: t }; action = 'approve'; ok = 'Zgłoszenie zatwierdzone';
    } else if (dialog.type === 'reject') {
      extra = { note: note.trim() }; action = 'reject'; ok = 'Zgłoszenie odrzucone';
    } else return;

    busyRef.current = true; setDialogBusy(true); setDialogError('');
    try {
      const result = await adminAction(dialog.row.id, action, extra);
      reportResult(result, ok);
      setDialog(result.link ? { type: 'link', link: result.link, email: dialog.row.email } : null);
      await refresh();
    } catch (e) { setDialogError(getErrorMessage(e, 'Nie udało się zapisać decyzji.')); }
    finally { busyRef.current = false; setDialogBusy(false); }
  };

  const cosign = async (row: AgreementRow) => {
    const slot = me && me === (row.rep_email ?? '').toLowerCase() ? 1 : me && me === (row.rep2_email ?? '').toLowerCase() ? 2 : 0;
    const as = slot === 1 ? `${row.rep_name}, ${row.rep_role}` : slot === 2 ? `${row.rep2_name}, ${row.rep2_role}` : 'osoba reprezentująca fundację';
    const ok = await confirm(
      `Podpiszesz dokumenty w imieniu fundacji jako: ${as}. Za fundację podpisują dwie osoby, każda ze swojego konta. Upewnij się, że ta osoba może reprezentować fundację zgodnie z KRS i statutem. Podpis zostanie zapisany na Twoim koncie administratora.`,
      { title: 'Podpis fundacji', confirmLabel: 'Podpisz' },
    );
    if (!ok) return;
    setBusyId(row.id);
    try {
      const result = await adminAction(row.id, 'cosign');
      if (result.completed) reportResult(result, 'Dokumenty podpisane przez obie osoby reprezentujące fundację');
      else toast(`Podpis zapisany. Czekamy na: ${result.waitingFor ?? 'drugą osobę'}.`, 'success');
      await refresh();
    } catch (e) {
      toast(getErrorMessage(e, 'Nie udało się zapisać podpisu.'), 'error');
      await refresh();
    } finally { setBusyId(null); }
  };
  const deleteKrk = async (row: AgreementRow) => {
    const ok = await confirm('Plik z informacją z KRK zostanie trwale usunięty. Zapis o dokonanej weryfikacji zostanie w systemie.', { title: 'Usuń plik KRK', confirmLabel: 'Usuń' });
    if (ok) await run(row, 'delete-krk', 'Plik KRK usunięty');
  };

  const field = <K extends keyof TermsForm>(key: K, value: TermsForm[K]) => {
    setTerms((t) => (t ? { ...t, [key]: value } : t));
    setDialogError('');
  };

  return (
    <>
      <Page
        eyebrow="Panel administracyjny"
        title="Umowy i zgody"
        lead="Zgłoszenia wolontariuszy i zleceniobiorców. Po zatwierdzeniu system generuje dokumenty na papierze firmowym i prowadzi osobę przez zgody oraz podpis."
        illustration="notes"
      >
        <Link to="/admin" className="link-accent mb-6 inline-flex items-center gap-2 text-sm">
          <FaArrowLeft aria-hidden="true" /> Wróć do panelu
        </Link>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div role="group" aria-label="Filtr statusu" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button key={f.key} type="button" aria-pressed={active} onClick={() => setFilter(f.key)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-3 text-sm font-semibold transition-colors sm:px-4 ${
                    active ? 'border-brand bg-brand text-white' : 'border-line-strong text-ink hover:border-brand-ink hover:text-brand-ink'}`}>
                  {f.label}
                  <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${active ? 'bg-white/20' : 'bg-surface-cool'}`}>{counts[f.key]}</span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={refresh} className="btn btn-secondary">Odśwież</button>
        </div>

        {loading && <Loader />}
        {!loading && err && <p role="alert" className="field-error">{err}</p>}
        {!loading && !err && visible.length === 0 && (
          <p className="muted">{rows.length === 0 ? 'Brak zgłoszeń. Jeśli spodziewasz się wniosków, sprawdź, czy Twój e-mail jest w tabeli admin_emails.' : 'Brak zgłoszeń w tym widoku.'}</p>
        )}

        {!loading && !err && visible.length > 0 && (
          <ul className="grid items-stretch gap-6 lg:grid-cols-2">
            {visible.map((r) => {
              const name = `${r.first_name} ${r.last_name}`;
              const busy = busyId === r.id;
              const minors = r.minors_checks_required;
              const blockers = [
                ...(minors && !r.krk_verified_at ? ['weryfikacja KRK'] : []),
                ...(minors && !r.rspts_verified_at ? ['weryfikacja w rejestrze'] : []),
              ];
              const showProgress = ['approved', 'signed', 'completed'].includes(r.status);
              return (
                <li key={r.id} className="h-full">
                  <article className="card flex h-full flex-col p-5 md:p-6">
                    <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-[1fr_auto] sm:gap-x-4">
                      <div className="min-w-0">
                        <h2 className="font-heading text-xl leading-snug font-semibold break-words">{name}</h2>
                        <p className="muted mt-1 text-sm break-words">{r.email}{r.phone ? ` · ${r.phone}` : ''}</p>
                        <p className="muted text-sm"><time dateTime={r.created_at}>{fmt(r.created_at)}</time></p>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                        <span className="font-heading text-lg font-semibold">{KIND_LABEL[r.kind]}</span>
                        <span className={`badge ${STATUS_CLASS[r.status]}`}>
                          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                          {STATUS_LABEL[r.status]}
                        </span>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-y-4">
                      <div>
                        <dt className={LABEL}>PESEL i adres</dt>
                        <dd className="mt-1 flex flex-wrap items-center gap-x-3 text-sm">
                          <span className="inline-flex items-center gap-1 font-mono">{r.pesel}<CopyButton value={r.pesel} label={`PESEL, ${name}`} /></span>
                          <span className="break-words">{r.street} {r.house_number}, {r.postal_code} {r.city}</span>
                        </dd>
                      </div>
                      {r.is_minor && (
                        <div>
                          <dt className={LABEL}>Osoba małoletnia. Podpisuje {r.guardian_relation}</dt>
                          <dd className="mt-1 text-sm break-words">
                            {r.guardian_first_name} {r.guardian_last_name} · {r.guardian_email} · {r.guardian_phone}
                          </dd>
                        </div>
                      )}
                      {r.note && <div><dt className={LABEL}>Opis od zgłaszającego</dt><dd className="mt-1 text-sm break-words whitespace-pre-wrap">{r.note}</dd></div>}
                      {r.scope && (
                        <div>
                          <dt className={LABEL}>Warunki</dt>
                          <dd className="mt-1 text-sm break-words">
                            {r.contract_number ? `Umowa nr ${r.contract_number}. ` : ''}{r.scope}. Od {fmtDay(r.start_date)}{r.end_date ? ` do ${fmtDay(r.end_date)}` : ', do rozwiązania'}
                            {r.rate_grosze ? `. ${formatPln(r.rate_grosze)} brutto za godzinę` : ''}.
                            {minors ? ' Kontakt z małoletnimi.' : ''}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {showProgress && (
                      <div className="mt-5 rounded-2xl border p-4 text-sm panel-cool">
                        <ul className="grid gap-1.5 sm:grid-cols-2">
                          <Step done={Boolean(r.consents_saved_at)}>Zgody i oświadczenia</Step>
                          <Step done={Boolean(r.signed_at)}>Podpis wnioskodawcy</Step>
                          {minors && <Step done={Boolean(r.krk_file_path || r.krk_file_deleted_at)}>KRK dołączony{r.krk_issue_date ? ` (${fmtDay(r.krk_issue_date)})` : ''}</Step>}
                          {minors && <Step done={Boolean(r.krk_verified_at)}>KRK zweryfikowany</Step>}
                          {minors && <Step done={Boolean(r.rspts_verified_at)}>Rejestr zweryfikowany</Step>}
                          <Step done={Boolean(r.cosign1_at)}>Podpis fundacji: {r.rep_name}</Step>
                          <Step done={Boolean(r.cosign2_at)}>Podpis fundacji: {r.rep2_name}</Step>
                        </ul>
                        {r.last_email_error && <p className="field-error mt-3 text-sm">Ostatni e-mail nie wyszedł: {r.last_email_error}</p>}
                        {r.template_approved === false && <p className="muted mt-3 text-xs">Podpisano na wzorze roboczym (znak wodny).</p>}
                      </div>
                    )}
                    {r.status === 'rejected' && r.decision_note && <p className="muted mt-4 text-sm break-words">Notatka: {r.decision_note}</p>}

                    <div className="mt-auto flex flex-wrap gap-2 pt-6">
                      {r.status === 'submitted' && (<>
                        <button type="button" className="btn btn-primary" onClick={() => openApprove(r)} aria-label={`Zatwierdź zgłoszenie: ${name}`}>Zatwierdź…</button>
                        <button type="button" className="btn border-2 border-danger text-danger hover:bg-danger hover:text-ink-inverse" onClick={() => openReject(r)} aria-label={`Odrzuć zgłoszenie: ${name}`}>Odrzuć…</button>
                      </>)}

                      {['approved', 'signed'].includes(r.status) && minors && (<>
                        {r.krk_file_path && <button type="button" className="btn btn-secondary" onClick={() => openKrk(r)} aria-label={`Otwórz KRK: ${name}`}>Otwórz KRK <FaArrowUpRightFromSquare aria-hidden="true" className="size-3.5" /></button>}
                        {r.krk_file_path && !r.krk_verified_at && <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => run(r, 'verify-krk', 'Weryfikacja KRK zapisana')}>Potwierdź KRK</button>}
                        {r.consent_rspts && !r.rspts_verified_at && <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => run(r, 'verify-rspts', 'Weryfikacja w rejestrze zapisana')}>Potwierdź rejestr</button>}
                      </>)}

                      {r.status === 'signed' && (() => {
                        const slot = me && me === (r.rep_email ?? '').toLowerCase() ? 1 : me && me === (r.rep2_email ?? '').toLowerCase() ? 2 : 0;
                        const already = slot === 1 ? r.cosign1_at : slot === 2 ? r.cosign2_at : null;
                        const reason = blockers.length ? `Najpierw: ${blockers.join(', ')}` : !slot ? 'Twoje konto nie jest przypisane do żadnej z osób podpisujących za fundację.' : already ? 'Już podpisałeś/aś. Czekamy na drugą osobę.' : undefined;
                        return (
                          <button type="button" disabled={busy || Boolean(reason)} className="btn btn-primary" onClick={() => cosign(r)} title={reason}>
                            Podpisz za fundację
                          </button>
                        );
                      })()}

                      {['approved', 'signed', 'completed'].includes(r.status) && (
                        <button type="button" className="btn btn-secondary" onClick={() => openPdf(r)}>{r.status === 'completed' ? 'Pobierz PDF' : 'Podgląd PDF'}</button>
                      )}
                      {['approved', 'completed'].includes(r.status) && (
                        <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => run(r, 'resend-link', 'Nowy link wysłany')}>Wyślij link ponownie</button>
                      )}
                      {r.status === 'approved' && <button type="button" className="btn border-2 border-danger text-danger hover:bg-danger hover:text-ink-inverse" onClick={() => openReject(r)}>Odrzuć…</button>}
                      {r.krk_file_path && r.krk_verified_at && ['signed', 'completed'].includes(r.status) && (
                        <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => deleteKrk(r)}>Usuń plik KRK</button>
                      )}
                      <button type="button" className="btn btn-ghost" onClick={() => openHistory(r)}>Historia</button>
                      {r.status === 'signed' && blockers.length > 0 && <p className="muted w-full text-sm">Przed podpisem fundacji potwierdź: {blockers.join(', ')}.</p>}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </Page>

      <Modal open={dialog !== null} onClose={closeDialog} size="lg"
        title={dialog?.type === 'approve' ? 'Zatwierdź zgłoszenie' : dialog?.type === 'reject' ? 'Odrzuć zgłoszenie' : dialog?.type === 'link' ? 'Link do dokumentów' : 'Historia zgłoszenia'}>
        {dialog?.type === 'approve' && terms && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed">
              {dialog.row.first_name} {dialog.row.last_name}, {KIND_LABEL[dialog.row.kind]}. Po zatwierdzeniu system wygeneruje dokumenty i wyśle wnioskodawcy link na adres <strong className="break-words">{dialog.row.email}</strong>.
            </p>
            {dialog.row.is_minor && (
              <p role="note" className="rounded-2xl border p-4 text-sm leading-relaxed panel-cool">
                Osoba małoletnia. Dokumenty podpisuje {dialog.row.guardian_relation} ({dialog.row.guardian_first_name} {dialog.row.guardian_last_name}), a wiadomości idą na adres {dialog.row.guardian_email}.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Miejscowość zawarcia umowy">{(a) => <input {...a} type="text" maxLength={100} value={terms.conclusionPlace} onChange={(e) => field('conclusionPlace', e.target.value)} className="input-text" />}</Field>
              {dialog.row.kind === 'mandate' && (
                <Field label="Numer umowy zlecenia" hint="Np. 3/2026.">{(a) => <input {...a} type="text" maxLength={40} value={terms.contractNumber} onChange={(e) => field('contractNumber', e.target.value)} className="input-text" />}</Field>
              )}
            </div>
            <Field label={dialog.row.kind === 'mandate' ? 'Zakres czynności (§ 1)' : 'Zakres czynności (§ 1 ust. 1)'} hint="Trafia do umowy, np. „pomoc w organizacji wydarzeń i prowadzenie profili w mediach społecznościowych”.">
              {(a) => <textarea {...a} rows={3} maxLength={1000} value={terms.scope} onChange={(e) => field('scope', e.target.value)} className="input-textarea" />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data rozpoczęcia">{(a) => <input {...a} type="date" value={terms.startDate} onChange={(e) => field('startDate', e.target.value)} className="input-text" />}</Field>
              <Field label={dialog.row.kind === 'mandate' ? 'Data zakończenia' : 'Data zakończenia (puste = do rozwiązania)'}>{(a) => <input {...a} type="date" value={terms.endDate} min={terms.startDate} onChange={(e) => field('endDate', e.target.value)} className="input-text" />}</Field>
            </div>

            {dialog.row.kind === 'mandate' ? (
              <Field label="Stawka brutto za godzinę (zł)" hint="Kwota słownie w umowie wygeneruje się automatycznie. Sprawdź stawkę minimalną na dany rok.">
                {(a) => <input {...a} type="text" inputMode="decimal" placeholder="45,00" value={terms.amount} onChange={(e) => field('amount', e.target.value)} className="input-text sm:max-w-xs" />}
              </Field>
            ) : (
              <div className="space-y-4">
                <Field label="Sposób pokrywania kosztów wolontariusza (§ 5 ust. 1)" hint="Np. „zwrot udokumentowanych kosztów dojazdu środkami komunikacji publicznej”.">
                  {(a) => <textarea {...a} rows={2} maxLength={500} value={terms.costsDescription} onChange={(e) => field('costsDescription', e.target.value)} className="input-textarea" />}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Termin przedłożenia rachunku, dni (§ 5 ust. 3)">{(a) => <input {...a} type="number" min={1} max={90} value={terms.costsDays} onChange={(e) => field('costsDays', e.target.value)} className="input-text" />}</Field>
                  <Field label="Termin ubezpieczenia zdrowotnego, dni (§ 7)">{(a) => <input {...a} type="number" min={0} max={90} value={terms.healthDays} onChange={(e) => field('healthDays', e.target.value)} className="input-text" />}</Field>
                </div>
              </div>
            )}

            <fieldset className="space-y-4 rounded-2xl border p-4 panel-cool">
              <legend className="font-heading px-2 text-lg font-semibold">Za fundację podpisują dwie osoby</legend>
              <p className="text-sm leading-relaxed">Każda podpisuje ze swojego konta administratora, więc podaj ich adresy e-mail logowania. Sprawdź reprezentację w KRS i statucie.</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Osoba 1">{(a) => <input {...a} type="text" maxLength={150} value={terms.repName} onChange={(e) => field('repName', e.target.value)} className="input-text" />}</Field>
                <Field label="Funkcja">{(a) => <input {...a} type="text" maxLength={100} placeholder="np. Prezes Zarządu" value={terms.repRole} onChange={(e) => field('repRole', e.target.value)} className="input-text" />}</Field>
                <Field label="E-mail konta">{(a) => <input {...a} type="email" maxLength={254} value={terms.repEmail} onChange={(e) => field('repEmail', e.target.value)} className="input-text" />}</Field>
                <Field label="Osoba 2">{(a) => <input {...a} type="text" maxLength={150} value={terms.rep2Name} onChange={(e) => field('rep2Name', e.target.value)} className="input-text" />}</Field>
                <Field label="Funkcja">{(a) => <input {...a} type="text" maxLength={100} placeholder="np. Członek Zarządu" value={terms.rep2Role} onChange={(e) => field('rep2Role', e.target.value)} className="input-text" />}</Field>
                <Field label="E-mail konta">{(a) => <input {...a} type="email" maxLength={254} value={terms.rep2Email} onChange={(e) => field('rep2Email', e.target.value)} className="input-text" />}</Field>
              </div>
            </fieldset>

            {!dialog.row.is_minor && (
              <div className="flex items-start gap-3 rounded-2xl border p-4 panel-cool">
                <input id="minors" type="checkbox" checked={terms.minors} onChange={(e) => field('minors', e.target.checked)} className="mt-1 size-5 shrink-0 accent-(--color-brand)" />
                <label htmlFor="minors" className="cursor-pointer text-sm leading-relaxed">
                  <strong>Zadania obejmują bezpośrednią pracę z małoletnimi.</strong> System poprosi o zaświadczenie z KRK i zgodę na weryfikację w Rejestrze Sprawców Przestępstw na Tle Seksualnym, a podpis fundacji będzie możliwy dopiero po ich potwierdzeniu. Zaznaczaj tylko wtedy, gdy prawo tego wymaga, bo informacje o niekaralności wolno zbierać wyłącznie na podstawie przepisów.
                </label>
              </div>
            )}

            {dialogError && <p role="alert" className="field-error">{dialogError}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={closeDialog} disabled={dialogBusy}>Anuluj</button>
              <button type="button" className="btn btn-primary" onClick={submitDialog} disabled={dialogBusy}>{dialogBusy ? 'Zapisujemy…' : 'Zatwierdź i wyślij link'}</button>
            </div>
          </div>
        )}

        {dialog?.type === 'reject' && (
          <div className="space-y-5">
            <p className="text-sm leading-relaxed">{dialog.row.first_name} {dialog.row.last_name} dostanie e-mail z informacją, że fundacja nie rozpoczyna współpracy.</p>
            <div>
              <label htmlFor="reject-note" className="field-label">Uzasadnienie do wiadomości (opcjonalnie)</label>
              <textarea id="reject-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className="input-textarea" />
              <p className="field-hint mt-1">Treść trafi do wiadomości e-mail.</p>
            </div>
            {dialogError && <p role="alert" className="field-error">{dialogError}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={closeDialog} disabled={dialogBusy}>Anuluj</button>
              <button type="button" className="btn btn-danger" onClick={submitDialog} disabled={dialogBusy}>{dialogBusy ? 'Zapisujemy…' : 'Odrzuć i wyślij e-mail'}</button>
            </div>
          </div>
        )}

        {dialog?.type === 'link' && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed">E-mail do <strong className="break-words">{dialog.email}</strong> nie został wysłany. Możesz przekazać link ręcznie. Jest osobisty, więc wyślij go tylko tej osobie.</p>
            <div className="flex items-center gap-1 rounded-2xl border p-3 font-mono text-xs break-all panel-cool">
              {dialog.link}<CopyButton value={dialog.link} label="link do dokumentów" />
            </div>
            <div className="flex justify-end"><button type="button" className="btn btn-secondary" onClick={closeDialog}>Zamknij</button></div>
          </div>
        )}

        {dialog?.type === 'history' && (
          <div className="space-y-3">
            {dialog.events === null ? <Loader /> : dialog.events.length === 0 ? <p className="muted">Brak zdarzeń.</p> : (
              <ol className="space-y-2 text-sm">
                {dialog.events.map((ev) => (
                  <li key={ev.id} className="grid gap-x-4 sm:grid-cols-[11rem_1fr]">
                    <time className="muted" dateTime={ev.at}>{fmt(ev.at)}</time>
                    <span><strong>{ev.event}</strong> <span className="muted break-words">({ev.actor})</span></span>
                  </li>
                ))}
              </ol>
            )}
            <div className="flex justify-end"><button type="button" className="btn btn-secondary" onClick={closeDialog}>Zamknij</button></div>
          </div>
        )}
      </Modal>
    </>
  );
}
