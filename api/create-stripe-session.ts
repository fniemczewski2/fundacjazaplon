import type { ServerResponse } from 'node:http';
import type Stripe from 'stripe';
import { isValidEmail } from '../shared/validation.js';
import { serviceClient, supabaseEnv } from './_lib/auth.js';
import { requireCaptcha } from './_lib/captcha.js';
import { DONATION_MAX_PLN, DONATION_MIN_PLN, FIELD_NAME_MAX, siteUrl } from './_lib/config.js';
import { bodyOf, sendJson, type ApiRequest, type JsonObject } from './_lib/http.js';
import { subscribeToMailerLite } from './_lib/mailerlite.js';
import { rateLimited } from './_lib/rateLimit.js';
import { getStripe } from './_lib/stripe.js';

interface DonationPayload {
  amount: number;
  isRecurring: boolean;
  safeName: string | undefined;
  email: string;
  marketingConsent: boolean;
}

function validatePayload(body: JsonObject): { data: DonationPayload } | { error: string } {
  const { amount, isRecurring, name, email, marketingConsent } = body;

  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount < DONATION_MIN_PLN ||
    amount > DONATION_MAX_PLN
  ) {
    return { error: `Kwota musi być liczbą z zakresu ${DONATION_MIN_PLN}-${DONATION_MAX_PLN} zł.` };
  }
  if (!isValidEmail(email)) return { error: 'Podaj prawidłowy adres e-mail.' };

  const safeName = typeof name === 'string' ? name.slice(0, FIELD_NAME_MAX) : undefined;
  return {
    data: {
      amount,
      isRecurring: Boolean(isRecurring),
      safeName,
      email,
      marketingConsent: marketingConsent === true,
    },
  };
}

async function subscribeDonor(email: string, safeName: string | undefined) {
  try {
    await subscribeToMailerLite({
      email,
      name: safeName,
      groups: [process.env.MAILERLITE_GROUP_ID, process.env.MAILERLITE_DONORS_GROUP_ID],
    });
  } catch (error) {
    console.error('Błąd zapisu do newslettera MailerLite:', error);
  }
}

type SessionInput = {
  stripe: Stripe;
  email: string;
  safeName: string | undefined;
  unitAmount: number;
  successUrl: string;
  cancelUrl: string;
};

async function createRecurringSession({
  stripe,
  email,
  safeName,
  unitAmount,
  successUrl,
  cancelUrl,
}: SessionInput) {
  // Nowy klient przy każdej wpłacie cyklicznej (bez wyszukiwania po e-mailu): link zarządzania z podziękowania
  // otwiera panel Stripe tego klienta, więc nie może dawać wglądu w wpłaty innej osoby o tym samym adresie.
  const customer = await stripe.customers.create({ email, name: safeName });

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customer.id,
    customer_update: { name: 'auto' },
    line_items: [
      {
        price_data: {
          currency: 'pln',
          unit_amount: unitAmount,
          recurring: { interval: 'month' },
          product_data: { name: 'Regularne wsparcie Fundacji „Zapłon”' },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

async function createOneTimeSession({
  stripe,
  email,
  safeName,
  unitAmount,
  successUrl,
  cancelUrl,
}: SessionInput) {
  return stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: 'pln',
          product_data: {
            name: 'Darowizna na rzecz Fundacji „Zapłon”',
            description: safeName ? `Wsparcie od: ${safeName}` : 'Dziękujemy!',
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Metoda niedozwolona' });

  const stripe = getStripe();
  if (!stripe) {
    console.error('Brak klucza STRIPE_SECRET_KEY w zmiennych środowiskowych.');
    return sendJson(res, 500, { error: 'Błąd konfiguracji płatności.' });
  }

  const body = bodyOf(req);
  const validation = validatePayload(body);
  if ('error' in validation) return sendJson(res, 400, { error: validation.error });
  const { amount, isRecurring, safeName, email, marketingConsent } = validation.data;

  const env = supabaseEnv();
  const db = env ? serviceClient(env) : undefined;
  if (await rateLimited(req, res, 'donation', db)) return;
  if (!(await requireCaptcha(req, res, body.captchaToken, db))) return;

  try {
    const base = siteUrl();
    const input: SessionInput = {
      stripe,
      email,
      safeName,
      unitAmount: Math.round(amount * 100),
      // Identyfikator sesji pozwala stronie podziękowania otworzyć panel zarządzania wpłatą cykliczną (bez webhooka).
      successUrl: `${base}/dziekujemy?session_id={CHECKOUT_SESSION_ID}${isRecurring ? '&typ=cykliczna' : ''}`,
      cancelUrl: `${base}/#donate`,
    };

    const session = isRecurring
      ? await createRecurringSession(input)
      : await createOneTimeSession(input);
    if (!session.url)
      return sendJson(res, 502, { error: 'Nie udało się utworzyć sesji płatności.' });

    // Zapis do newslettera dopiero po utworzeniu sesji płatności i tylko za zgodą.
    if (marketingConsent) await subscribeDonor(email, safeName);

    return sendJson(res, 200, { url: session.url });
  } catch (err) {
    console.error('Stripe handler error:', err);
    return sendJson(res, 500, { error: 'Błąd serwera. Spróbuj ponownie.' });
  }
}
