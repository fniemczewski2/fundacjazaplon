import type { ServerResponse } from 'node:http';
import { serviceClient, supabaseEnv } from './_lib/auth.js';
import { siteUrl } from './_lib/config.js';
import { bodyOf, sendJson, shorten, type ApiRequest } from './_lib/http.js';
import { rateLimited } from './_lib/rateLimit.js';
import { CHECKOUT_SESSION_RE, MANAGE_LINK_TTL_SECONDS, getStripe } from './_lib/stripe.js';

/**
 * Otwiera panel zarządzania wpłatą cykliczną (anulowanie, zmiana karty) dla klienta z sesji Checkout.
 * Dowodem uprawnienia jest sam identyfikator sesji z adresu strony podziękowania: jest nieodgadnialny, a link działa 24 godziny.
 * Bez webhooka: stan sesji pobieramy z Stripe w chwili żądania.
 */
export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metoda niedozwolona' });

  const stripe = getStripe();
  if (!stripe) return sendJson(res, 503, { error: 'Płatności online nie są skonfigurowane.' });

  const env = supabaseEnv();
  const db = env ? serviceClient(env) : undefined;
  if (await rateLimited(req, res, 'stripePortal', db)) return;

  const sessionId =
    typeof bodyOf(req).sessionId === 'string' ? (bodyOf(req).sessionId as string).trim() : '';
  if (!CHECKOUT_SESSION_RE.test(sessionId))
    return sendJson(res, 400, { error: 'Nieprawidłowy link.' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode !== 'subscription' || session.status !== 'complete' || !session.customer) {
      return sendJson(res, 400, { error: 'Ten link nie dotyczy wpłaty cyklicznej.' });
    }
    if (Date.now() / 1000 - session.created > MANAGE_LINK_TTL_SECONDS) {
      return sendJson(res, 410, {
        error: 'Ten link już wygasł. Wejdź na stronę /subskrypcja, aby zarządzać wpłatą.',
        expired: true,
      });
    }

    const customer = typeof session.customer === 'string' ? session.customer : session.customer.id;
    const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim() || undefined;

    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${siteUrl()}/subskrypcja`,
      ...(configuration ? { configuration } : {}),
    });
    return sendJson(res, 200, { url: portal.url });
  } catch (err) {
    console.error('stripe-portal:', shorten(err));
    return sendJson(res, 502, {
      error: 'Zarządzanie wpłatą jest chwilowo niedostępne. Napisz do nas, a anulujemy ją ręcznie.',
    });
  }
}
