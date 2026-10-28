// src/routes/admin/Settlements.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { FaArrowLeft, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import Loader from '../../components/Loader';
import Modal from '../../components/Modal';
import Page from '../../components/Page';
import { useToast } from '../../components/ui/Feedback';
import { getErrorMessage } from '../../lib/utils/errors';
import { formatIban } from '../../lib/settlements';
import {
  decideSettlement,
  formatPln,
  getInvoiceUrl,
  listSettlements,
  type SettlementRow,
  type SettlementStatus,
} from '../../lib/settlementsAdmin';

type Filter = 'new' | 'accepted' | 'rejected' | 'all';

const FILTERS: ReadonlyArray<{ key: Filter; label: string }> = [
  { key: 'new', label: 'Do rozpatrzenia' },
  { key: 'accepted', label: 'Zatwierdzone' },
  { key: 'rejected', label: 'Odrzucone' },
  { key: 'all', label: 'Wszystkie' },
];

const STATUS_LABEL: Record<SettlementStatus, string> = {
  new: 'do rozpatrzenia',
  accepted: 'zatwierdzone',
  paid: 'wypłacone',
  rejected: 'odrzucone',
};

// Kolory z tokenów motywu - w ciemnym motywie zmieniają się razem ze stroną.
const STATUS_CLASS: Record<SettlementStatus, string> = {
  new: 'bg-surface-warm text-ember-ink',
  accepted: 'bg-surface-cool text-success',
  paid: 'bg-surface-cool text-success',
  rejected: 'bg-surface-cool text-danger',
};

const LABEL = 'muted text-xs tracking-wide uppercase';

type Dialog = { row: SettlementRow; action: 'approve' | 'reject' };

function CopyButton({ value, label }: Readonly<{ value: string; label: string }>) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Nie udało się skopiować wartości', e);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-cool"
      aria-label={copied ? `Skopiowano: ${label}` : `Skopiuj: ${label}`}
    >
      {copied ? (
        <FiCheck aria-hidden="true" className="size-4 text-success" />
      ) : (
        <FiCopy aria-hidden="true" className="size-4" />
      )}
    </button>
  );
}

export default function AdminSettlements() {
  const toast = useToast();

  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('new');

  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      setRows(await listSettlements());
    } catch (e) {
      setErr(getErrorMessage(e, 'Błąd pobierania danych.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const counts = useMemo(
    () => ({
      new: rows.filter((r) => r.status === 'new').length,
      accepted: rows.filter((r) => r.status === 'accepted' || r.status === 'paid').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
      all: rows.length,
    }),
    [rows],
  );

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (filter === 'all') return true;
        if (filter === 'accepted') return r.status === 'accepted' || r.status === 'paid';
        return r.status === filter;
      }),
    [rows, filter],
  );

  // Stabilna funkcja: Modal rejestruje efekt zależny od `onClose`, więc zmiana jej
  // tożsamości przy każdym renderze przenosiłaby fokus z pola tekstowego.
  const closeDialog = useCallback(() => {
    if (!busyRef.current) setDialog(null);
  }, []);

  const openDialog = (row: SettlementRow, action: Dialog['action']) => {
    setNote('');
    setNoteError('');
    setDialog({ row, action });
  };

  const submitDecision = async () => {
    if (!dialog || busyRef.current) return;

    const text = note.trim();
    if (dialog.action === 'reject' && text.length < 3) {
      setNoteError('Podaj powód odrzucenia (min. 3 znaki).');
      return;
    }

    busyRef.current = true;
    setBusy(true);
    try {
      const result = await decideSettlement(dialog.row.id, dialog.action, text);
      const verb = dialog.action === 'approve' ? 'zatwierdzone' : 'odrzucone';

      if (result.emailSent) {
        toast(`Rozliczenie ${verb}. E-mail wysłano do wnioskodawcy.`, 'success');
      } else {
        toast(
          `Rozliczenie ${verb}, ale e-mail NIE został wysłany: ${result.emailError ?? 'nieznany błąd'}. Użyj „Wyślij ponownie”.`,
          'error',
        );
      }
      setDialog(null);
      await refresh();
    } catch (e) {
      toast(getErrorMessage(e, 'Nie udało się zapisać decyzji.'), 'error');
      // 409 = ktoś rozpatrzył wniosek wcześniej - odśwież widok.
      await refresh();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const resend = async (row: SettlementRow) => {
    setResendingId(row.id);
    try {
      const result = await decideSettlement(row.id, 'resend');
      toast(
        result.emailSent
          ? 'E-mail wysłano do wnioskodawcy.'
          : `E-mail nadal nie został wysłany: ${result.emailError ?? 'nieznany błąd'}`,
        result.emailSent ? 'success' : 'error',
      );
      await refresh();
    } catch (e) {
      toast(getErrorMessage(e, 'Nie udało się wysłać e-maila.'), 'error');
    } finally {
      setResendingId(null);
    }
  };

  const openInvoice = async (row: SettlementRow) => {
    if (!row.file_path) return;
    // Okno otwieramy synchronicznie z kliknięcia - po `await` blokują je przeglądarki.
    const popup = window.open('about:blank', '_blank');
    try {
      const url = await getInvoiceUrl(row.file_path);
      if (popup) {
        popup.opener = null;
        popup.location.href = url;
      } else {
        toast('Przeglądarka zablokowała nowe okno. Zezwól na wyskakujące okna dla tej strony.', 'error');
      }
    } catch (e) {
      popup?.close();
      toast(getErrorMessage(e, 'Nie udało się otworzyć pliku.'), 'error');
    }
  };

  return (
    <>
      <Page
        eyebrow="Panel administracyjny"
        title="Rozliczenia faktur"
        lead="Wnioski o zwrot wydatków. Każda decyzja wysyła wiadomość do osoby, która złożyła wniosek."
        illustration="notes"
      >
        <Link to="/admin" className="link-accent mb-6 inline-flex items-center gap-2 text-sm">
          <FaArrowLeft aria-hidden="true" />
          Wróć do panelu
        </Link>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div role="group" aria-label="Filtr statusu" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.key)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-3 text-sm sm:px-4 font-semibold transition-colors ${
                    active
                      ? 'border-brand bg-brand text-white'
                      : 'border-line-strong text-ink hover:border-brand-ink hover:text-brand-ink'
                  }`}
                >
                  {f.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                      active ? 'bg-white/20' : 'bg-surface-cool'
                    }`}
                  >
                    {counts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <button type="button" onClick={refresh} className="btn btn-secondary">
            Odśwież
          </button>
        </div>

        {loading && <Loader />}

        {!loading && err && (
          <p role="alert" className="field-error">
            {err}
          </p>
        )}

        {!loading && !err && visible.length === 0 && (
          <p className="muted">
            {rows.length === 0
              ? 'Brak zgłoszeń. Jeśli spodziewasz się wniosków, sprawdź, czy Twój e-mail jest w tabeli admin_emails.'
              : 'Brak zgłoszeń w tym widoku.'}
          </p>
        )}

        {!loading && !err && visible.length > 0 && (
          <ul className="grid items-stretch gap-6 lg:grid-cols-2">
            {visible.map((r) => {
              const fullName = `${r.first_name} ${r.last_name}`;
              const decided = r.status !== 'new';
              const canResend = decided && !r.notified_at;
              return (
                <li key={r.id} className="h-full">
                  <article className="card flex h-full flex-col p-5 md:p-6">
                    <div className="grid grid-cols-1 gap-y-3 sm:grid-cols-[1fr_auto] sm:gap-x-4">
                      <div className="min-w-0">
                        <h2 className="font-heading text-xl leading-snug font-semibold break-words">{fullName}</h2>
                        <p className="muted mt-1 text-sm break-words">{r.email ?? 'brak adresu e-mail'}</p>
                        <p className="muted text-sm">
                          <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleString('pl-PL')}</time>
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                        <p className="font-heading text-2xl leading-none font-semibold tabular-nums">
                          {formatPln(r.amount_grosze)}
                        </p>
                        <span className={`badge ${STATUS_CLASS[r.status]}`}>
                          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                          {STATUS_LABEL[r.status]}
                        </span>
                      </div>
                    </div>

                    <dl className="mt-5 grid gap-y-4">
                      <div>
                        <dt className={LABEL}>Cel wydatku</dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words">{r.purpose}</dd>
                      </div>

                      <div>
                        <dt className={LABEL}>Numer konta</dt>
                        <dd className="mt-1 flex items-center gap-1 font-mono text-[0.8125rem] sm:text-sm">
                          {formatIban(r.iban)}
                          <CopyButton value={r.iban} label={`numer konta, ${fullName}`} />
                        </dd>
                      </div>

                      <div>
                        <dt className={LABEL}>Dokument</dt>
                        <dd className="mt-1 flex min-h-8 items-center gap-1 text-sm">
                          {r.invoice_kind === 'pdf' ? (
                            <button
                              type="button"
                              onClick={() => openInvoice(r)}
                              className="link-accent inline-flex items-center gap-2 underline"
                              aria-label={`Otwórz PDF faktury: ${fullName}`}
                            >
                              Otwórz PDF
                              <FaArrowUpRightFromSquare aria-hidden="true" className="size-3" />
                            </button>
                          ) : (
                            <>
                              <span className="font-mono break-all">{r.ksef_number}</span>
                              {r.ksef_number && (
                                <CopyButton value={r.ksef_number} label={`numer KSeF, ${fullName}`} />
                              )}
                            </>
                          )}
                        </dd>
                      </div>
                    </dl>

                    {decided && (
                      <div className="mt-5 space-y-1 rounded-2xl border p-4 text-sm panel-cool">
                        <p>
                          <span className="muted">Decyzja: </span>
                          {r.decided_by ?? '-'}
                          {r.decided_at && `, ${new Date(r.decided_at).toLocaleString('pl-PL')}`}
                        </p>
                        {r.decision_note && (
                          <p className="whitespace-pre-wrap break-words">
                            <span className="muted">Notatka: </span>
                            {r.decision_note}
                          </p>
                        )}
                        <p>
                          <span className="muted">E-mail: </span>
                          {r.notified_at ? (
                            <>wysłano {new Date(r.notified_at).toLocaleString('pl-PL')}</>
                          ) : (
                            <span className="field-error text-sm">
                              nie wysłano{r.notify_error ? `: ${r.notify_error}` : ''}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {(r.status === 'new' || canResend) && (
                      <div className="mt-auto flex flex-wrap gap-2 pt-6">
                        {r.status === 'new' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openDialog(r, 'approve')}
                              className="btn btn-primary"
                              aria-label={`Zatwierdź rozliczenie: ${fullName}`}
                            >
                              Zatwierdź
                            </button>
                            <button
                              type="button"
                              onClick={() => openDialog(r, 'reject')}
                              className="btn border-2 border-danger text-danger hover:bg-danger hover:text-ink-inverse"
                              aria-label={`Odrzuć rozliczenie: ${fullName}`}
                            >
                              Odrzuć
                            </button>
                          </>
                        )}

                        {canResend && (
                          <button
                            type="button"
                            onClick={() => resend(r)}
                            disabled={resendingId === r.id}
                            className="btn btn-secondary"
                          >
                            {resendingId === r.id ? 'Wysyłamy…' : 'Wyślij ponownie'}
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </Page>

      <Modal
        open={dialog !== null}
        onClose={closeDialog}
        title={dialog?.action === 'approve' ? 'Zatwierdź rozliczenie' : 'Odrzuć rozliczenie'}
      >
        {dialog && (
          <div className="space-y-5">
            <dl className="space-y-3 rounded-2xl border p-4 text-sm panel-cool">
              <div>
                <dt className={LABEL}>Wnioskodawca</dt>
                <dd className="mt-0.5 font-semibold">
                  {dialog.row.first_name} {dialog.row.last_name}, {formatPln(dialog.row.amount_grosze)}
                </dd>
              </div>
              <div>
                <dt className={LABEL}>Wiadomość zostanie wysłana na</dt>
                <dd className="mt-0.5 break-words">{dialog.row.email ?? '(brak adresu)'}</dd>
              </div>
            </dl>

            <div>
              <label htmlFor="decision-note" className="field-label">
                {dialog.action === 'approve' ? 'Uwagi dla wnioskodawcy (opcjonalnie)' : 'Powód odrzucenia'}
              </label>
              <textarea
                id="decision-note"
                rows={4}
                maxLength={1000}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setNoteError('');
                }}
                aria-invalid={noteError ? true : undefined}
                aria-describedby={noteError ? 'decision-note-error' : undefined}
                className="input-textarea"
              />
              {noteError && (
                <p id="decision-note-error" className="field-error mt-1">
                  {noteError}
                </p>
              )}
              <p className="field-hint mt-1">Treść trafi do wiadomości e-mail.</p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={closeDialog} disabled={busy} className="btn btn-secondary">
                Anuluj
              </button>
              <button
                type="button"
                onClick={submitDecision}
                disabled={busy}
                className={`btn ${dialog.action === 'approve' ? 'btn-primary' : 'btn-danger'}`}
              >
                {busy ? 'Zapisujemy…' : dialog.action === 'approve' ? 'Zatwierdź i wyślij e-mail' : 'Odrzuć i wyślij e-mail'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
