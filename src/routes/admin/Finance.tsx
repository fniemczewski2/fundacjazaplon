import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useAsyncData } from '../../hooks/useAsyncData';
import { cancelSubscription, getFinanceSummary } from '../../lib/finance';
import { formatMoney, formatMoneyList } from '../../lib/money';
import { getErrorMessage } from '../../lib/utils/errors';
import { useConfirm, useToast } from '../../components/ui/Feedback';
import Loader from '../../components/Loader';
import type {
  FinanceSummary,
  SubscriptionInterval,
  SubscriptionSummary,
} from '../../../shared/finance';

const EMPTY: FinanceSummary = {
  available: [],
  pending: [],
  monthlyRecurring: [],
  subscriptions: [],
  truncated: false,
};

const INTERVAL_LABEL: Record<SubscriptionInterval, string> = {
  day: 'dzień',
  week: 'tydz.',
  month: 'mies.',
  year: 'rok',
};

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pl-PL') : '-');

function perInterval(sub: SubscriptionSummary): string {
  const unit =
    sub.intervalCount > 1
      ? `${sub.intervalCount} ${INTERVAL_LABEL[sub.interval]}`
      : INTERVAL_LABEL[sub.interval];
  return `${formatMoney(sub)} / ${unit}`;
}

function activeLabel(n: number): string {
  if (n === 1) return '1 aktywna wpłata';
  const lastTwo = n % 100;
  const last = n % 10;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
    ? `${n} aktywne wpłaty`
    : `${n} aktywnych wpłat`;
}

export default function AdminFinance() {
  const { data, loading, error, reload } = useAsyncData(
    getFinanceSummary,
    EMPTY,
    'Nie udało się pobrać danych ze Stripe.',
  );
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const showToast = useToast();
  const confirm = useConfirm();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.subscriptions;
    return data.subscriptions.filter(
      (s) => s.email?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q),
    );
  }, [data.subscriptions, query]);

  const activeCount = data.subscriptions.filter(
    (s) => s.status === 'active' && !s.endsAtPeriodEnd,
  ).length;

  const onCancel = async (sub: SubscriptionSummary) => {
    const who = sub.email ?? sub.id;
    const confirmed = await confirm(
      `Anulować wpłatę cykliczną ${perInterval(sub)} (${who})? Kolejne płatności nie zostaną pobrane. Tej operacji nie można cofnąć.`,
      {
        title: 'Anuluj wpłatę cykliczną',
        confirmLabel: 'Anuluj wpłatę',
      },
    );
    if (!confirmed) return;
    setBusyId(sub.id);
    try {
      await cancelSubscription(sub.id);
      showToast('Wpłata anulowana.', 'success');
      await reload();
    } catch (err) {
      showToast(getErrorMessage(err, 'Nie udało się anulować wpłaty.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Finanse (Stripe)</h1>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void reload()}
            disabled={loading}
          >
            Odśwież
          </button>
          <Link to="/admin" className="btn btn-secondary">
            Panel
          </Link>
        </div>
      </div>

      {loading && <Loader />}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}

      <section className="border rounded-2xl p-5 space-y-4" aria-label="Saldo">
        <div>
          <div className="text-sm text-ink-muted">Dostępne do wypłaty</div>
          <div className="text-4xl font-semibold mt-1">{formatMoneyList(data.available)}</div>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-ink-muted">W trakcie rozliczania</dt>
            <dd className="text-xl font-medium">{formatMoneyList(data.pending)}</dd>
            <dd className="text-xs text-ink-muted mt-0.5">
              Stripe udostępni te środki w ciągu kilku dni.
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Wpłaty cykliczne</dt>
            <dd className="text-xl font-medium">
              {formatMoneyList(data.monthlyRecurring)} / mies.
            </dd>
            <dd className="text-xs text-ink-muted mt-0.5">{activeLabel(activeCount)}</dd>
          </div>
        </dl>
        <p className="text-xs text-ink-muted">
          Saldo konta Stripe. Nie obejmuje przelewów tradycyjnych na konto bankowe ani środków,
          które Stripe już wypłacił na konto.
        </p>
      </section>

      <section className="border rounded-2xl p-5 space-y-4" aria-label="Wpłaty cykliczne">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Wpłaty cykliczne</h2>
            <p className="text-sm text-ink-muted">
              Anuluj wpłatę, gdy darczyńca o to poprosi. Kolejne płatności nie zostaną pobrane.
            </p>
          </div>
          <label className="block text-sm sm:w-64" htmlFor="sub-search">
            Szukaj po e-mailu lub nazwie
            <input
              id="sub-search"
              type="search"
              className="border p-2 rounded w-full"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>

        {data.subscriptions.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {loading ? '' : 'Nikt jeszcze nie wpłaca regularnie.'}
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-ink-muted">Brak wpłat pasujących do „{query}”.</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((s) => (
              <li
                key={s.id}
                className="py-3 flex flex-wrap items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="break-all">{s.email ?? 'brak e-maila'}</div>
                  {s.name && <div className="text-ink-muted">{s.name}</div>}
                  <div>
                    {perInterval(s)}, od {formatDate(s.startedAt)}
                  </div>
                  <div className="text-ink-muted">
                    {s.endsAtPeriodEnd
                      ? `Wygasa ${formatDate(s.currentPeriodEnd)}`
                      : `Następna płatność: ${formatDate(s.currentPeriodEnd)}`}
                  </div>
                  {s.status === 'past_due' && <div className="text-danger">Nieudana płatność</div>}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busyId !== null}
                  onClick={() => void onCancel(s)}
                >
                  {busyId === s.id ? 'Anulowanie…' : 'Anuluj'}
                </button>
              </li>
            ))}
          </ul>
        )}

        {data.truncated && (
          <p className="text-xs text-ink-muted">
            Pokazano pierwsze 1000 wpłat. Pełną listę znajdziesz w panelu Stripe.
          </p>
        )}
      </section>
    </div>
  );
}
