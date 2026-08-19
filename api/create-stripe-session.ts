import type { IncomingMessage, ServerResponse } from 'node:http';
import Stripe from 'stripe';

interface ApiRequest extends IncomingMessage {
  body?: any;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {});

const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://zaplon.org.pl';

const MIN_AMOUNT_PLN = 1;
const MAX_AMOUNT_PLN = 50_000;

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value);
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

interface DonationPayload {
  amount: number;
  isRecurring: boolean;
  safeName: string | undefined;
  email: string;
  marketingConsent: boolean;
}

function validatePayload(body: any): { data: DonationPayload } | { error: string } {
  const { amount, isRecurring, name, email, marketingConsent } = body ?? {};

  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount < MIN_AMOUNT_PLN ||
    amount > MAX_AMOUNT_PLN
  ) {
    return { error: `Kwota musi być liczbą z zakresu ${MIN_AMOUNT_PLN}-${MAX_AMOUNT_PLN} zł.` };
  }

  if (!isValidEmail(email)) {
    return { error: 'Podaj prawidłowy adres e-mail.' };
  }

  const safeName = typeof name === 'string' ? name.slice(0, 200) : undefined;

  return {
    data: { amount, isRecurring: !!isRecurring, safeName, email, marketingConsent: marketingConsent === true },
  };
}

async function subscribeToNewsletter(email: string, safeName: string | undefined) {
  try {
    const ML_API_KEY = process.env.MAILERLITE_API_KEY;
    const ALL_GROUP_ID = process.env.MAILERLITE_GROUP_ID;
    const DONORS_GROUP_ID = process.env.MAILERLITE_DONORS_GROUP_ID;

    if (!ML_API_KEY) return;

    const groupsToJoin = [ALL_GROUP_ID, DONORS_GROUP_ID].filter((id): id is string => !!id);

    await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ML_API_KEY}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email,
        fields: { name: safeName },
        groups: groupsToJoin.length > 0 ? groupsToJoin : undefined,
        status: 'active',
      }),
    });
  } catch (mlError) {
    console.error('Błąd zapisu do newslettera MailerLite:', mlError);
  }
}

async function createRecurringSession(email: string, safeName: string | undefined, unitAmount: number, successUrl: string, cancelUrl: string) {
  const recurringProductId = process.env.STRIPE_RECURRING_PRODUCT_ID;
  if (!recurringProductId) {
    throw new Error('Brak konfiguracji STRIPE_RECURRING_PRODUCT_ID.');
  }

  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0] ?? (await stripe.customers.create({ email, name: safeName }));

  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customer.id,
    customer_update: { name: 'auto' },
    line_items: [
      {
        price_data: {
          currency: 'pln',
          product: recurringProductId,
          unit_amount: unitAmount,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

async function createOneTimeSession(email: string, safeName: string | undefined, unitAmount: number, successUrl: string, cancelUrl: string) {
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
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Metoda niedozwolona' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Brak klucza STRIPE_SECRET_KEY w zmiennych środowiskowych.');
    return sendJson(res, 500, { error: 'Błąd konfiguracji płatności.' });
  }

  const validation = validatePayload(req.body);
  if ('error' in validation) {
    return sendJson(res, 400, { error: validation.error });
  }
  const { amount, isRecurring, safeName, email, marketingConsent } = validation.data;

  try {
    if (marketingConsent) {
      await subscribeToNewsletter(email, safeName);
    }

    const unitAmount = Math.round(amount * 100);
    const successUrl = `${SITE_URL}/dziekujemy`;
    const cancelUrl = `${SITE_URL}/#donate`;

    const session = isRecurring
      ? await createRecurringSession(email, safeName, unitAmount, successUrl, cancelUrl)
      : await createOneTimeSession(email, safeName, unitAmount, successUrl, cancelUrl);

    if (!session.url) {
      return sendJson(res, 502, { error: 'Nie udało się utworzyć sesji płatności.' });
    }

    return sendJson(res, 200, { url: session.url });
  } catch (err) {
    console.error('Stripe handler error:', err);
    return sendJson(res, 500, { error: 'Błąd serwera. Spróbuj ponownie.' });
  }
}