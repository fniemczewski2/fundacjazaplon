import type { ServerResponse } from 'node:http';
import Stripe from 'stripe';
import { authenticateAdmin } from './_lib/auth.js';
import { bodyOf, sendJson, shorten, type ApiRequest } from './_lib/http.js';
import { logSecurityEvent } from './_lib/securityEvents.js';
import { getStripe } from './_lib/stripe.js';
import {
  SUBSCRIPTION_ID_RE,
  type FinanceSummary,
  type MoneyAmount,
  type SubscriptionInterval,
  type SubscriptionSummary,
} from '../shared/finance.js';

const MAX_SUBSCRIPTIONS = 1000;

const MONTHS_PER_INTERVAL: Record<SubscriptionInterval, number> = {
  day: 12 / 365,
  week: 12 / 52,
  month: 1,
  year: 12,
};

const INTERVALS = new Set<string>(['day', 'week', 'month', 'year']);

function toInterval(value: string | undefined): SubscriptionInterval {
  return value && INTERVALS.has(value) ? (value as SubscriptionInterval) : 'month';
}

function sumByCurrency(items: Array<{ amount: number; currency: string }>): MoneyAmount[] {
  const totals = new Map<string, number>();
  for (const { amount, currency } of items)
    totals.set(currency, (totals.get(currency) ?? 0) + amount);
  return [...totals].map(([currency, amount]) => ({ currency, amount: Math.round(amount) }));
}

function toSummary(sub: Stripe.Subscription): SubscriptionSummary {
  const customer = typeof sub.customer === 'string' || sub.customer.deleted ? null : sub.customer;
  const items = sub.items.data;
  const first = items[0]?.price;
  const amount = items.reduce(
    (sum, item) => sum + (item.price.unit_amount ?? 0) * (item.quantity ?? 1),
    0,
  );
  const periodEnds = items
    .map((item) => item.current_period_end)
    .filter((v): v is number => Boolean(v));

  return {
    id: sub.id,
    status: sub.status === 'past_due' ? 'past_due' : 'active',
    email: customer?.email ?? null,
    name: customer?.name ?? null,
    amount,
    currency: sub.currency,
    interval: toInterval(first?.recurring?.interval),
    intervalCount: first?.recurring?.interval_count ?? 1,
    startedAt: new Date(sub.start_date * 1000).toISOString(),
    currentPeriodEnd: periodEnds.length
      ? new Date(Math.min(...periodEnds) * 1000).toISOString()
      : null,
    endsAtPeriodEnd: sub.cancel_at_period_end || sub.cancel_at !== null,
  };
}

function listSubscriptions(stripe: Stripe, status: 'active' | 'past_due') {
  return stripe.subscriptions
    .list({ status, limit: 100, expand: ['data.customer'] })
    .autoPagingToArray({ limit: MAX_SUBSCRIPTIONS });
}

async function summary(stripe: Stripe): Promise<FinanceSummary> {
  const [balance, active, pastDue] = await Promise.all([
    stripe.balance.retrieve(),
    listSubscriptions(stripe, 'active'),
    listSubscriptions(stripe, 'past_due'),
  ]);

  const subscriptions = [...active, ...pastDue]
    .map(toSummary)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const monthlyRecurring = sumByCurrency(
    subscriptions
      .filter((s) => s.status === 'active' && !s.endsAtPeriodEnd)
      .map((s) => ({
        currency: s.currency,
        amount: s.amount / (MONTHS_PER_INTERVAL[s.interval] * s.intervalCount),
      })),
  );

  return {
    available: sumByCurrency(balance.available),
    pending: sumByCurrency(balance.pending),
    monthlyRecurring,
    subscriptions,
    truncated: active.length >= MAX_SUBSCRIPTIONS || pastDue.length >= MAX_SUBSCRIPTIONS,
  };
}

/** Panel Finanse (rola admin): saldo Stripe, lista wpłat cyklicznych i ich anulowanie. Akcje: `summary`, `cancel`. */
export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metoda niedozwolona' });

  const auth = await authenticateAdmin(req, res, 'finance');
  if (!auth) return;

  const stripe = getStripe();
  if (!stripe)
    return sendJson(res, 503, {
      error: 'Stripe nie jest skonfigurowany (brak STRIPE_SECRET_KEY).',
    });

  const body = bodyOf(req);

  try {
    if (body.action === 'summary') return sendJson(res, 200, await summary(stripe));

    if (body.action === 'cancel') {
      const id = typeof body.id === 'string' ? body.id : '';
      if (!SUBSCRIPTION_ID_RE.test(id))
        return sendJson(res, 400, { error: 'Nieprawidłowy identyfikator wpłaty.' });
      try {
        await stripe.subscriptions.cancel(id);
      } catch (err) {
        if (err instanceof Stripe.errors.StripeInvalidRequestError) {
          return sendJson(res, 404, { error: 'Nie znaleziono wpłaty albo jest już anulowana.' });
        }
        throw err;
      }
      await logSecurityEvent(auth.db, req, 'subscription_canceled', {
        by: auth.adminEmail,
        subscription: id,
      });
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 400, { error: 'Nieprawidłowa akcja.' });
  } catch (err) {
    console.error('finance:', shorten(err));
    return sendJson(res, 502, {
      error: 'Operacja na Stripe nie powiodła się. Sprawdź klucz API i spróbuj ponownie.',
    });
  }
}
