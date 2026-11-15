// Typy wspólne dla funkcji serwerowej finansów (api/finance.ts) i panelu (src/routes/admin/Finance.tsx).

export type MoneyAmount = { amount: number; currency: string };

export type SubscriptionInterval = 'day' | 'week' | 'month' | 'year';

export type SubscriptionSummary = {
  id: string;
  status: 'active' | 'past_due';
  email: string | null;
  name: string | null;
  amount: number;
  currency: string;
  interval: SubscriptionInterval;
  intervalCount: number;
  startedAt: string;
  currentPeriodEnd: string | null;
  endsAtPeriodEnd: boolean;
};

export type FinanceSummary = {
  available: MoneyAmount[];
  pending: MoneyAmount[];
  monthlyRecurring: MoneyAmount[];
  subscriptions: SubscriptionSummary[];
  truncated: boolean;
};

/** Identyfikator subskrypcji Stripe (walidacja przed anulowaniem). */
export const SUBSCRIPTION_ID_RE = /^sub_[A-Za-z0-9]{8,250}$/;
