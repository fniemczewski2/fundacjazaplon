import { postJson } from './api';
import { supabase } from './supabase';
import type { FinanceSummary } from '../../shared/finance';

async function call<T>(body: Record<string, unknown>, fallbackError: string): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sesja wygasła. Zaloguj się ponownie.');
  return postJson<T>('/api/finance', body, fallbackError, token);
}

export const getFinanceSummary = () =>
  call<FinanceSummary>({ action: 'summary' }, 'Nie udało się pobrać danych ze Stripe.');

export const cancelSubscription = (id: string) =>
  call<{ ok: true }>({ action: 'cancel', id }, 'Nie udało się anulować wpłaty.');

/** Otwiera panel zarządzania wpłatą cykliczną w Stripe (publiczny, po identyfikatorze sesji z podziękowania). */
export async function openPortal(sessionId: string): Promise<string> {
  const result = await postJson<{ url?: string }>(
    '/api/stripe-portal',
    { sessionId },
    'Nie udało się otworzyć panelu wpłaty.',
  );
  if (!result.url) throw new Error('Nie udało się otworzyć panelu wpłaty.');
  return result.url;
}
