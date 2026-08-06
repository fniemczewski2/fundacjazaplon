import type { IncomingMessage, ServerResponse } from 'http';
import Stripe from 'stripe';

interface ApiRequest extends IncomingMessage {
  body?: any;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {});

const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://zaplon.org.pl';

const MIN_AMOUNT_PLN = 1;
const MAX_AMOUNT_PLN = 50_000;

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req: ApiRequest, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Metoda niedozwolona' }));
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Brak klucza STRIPE_SECRET_KEY w zmiennych środowiskowych.');
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Błąd konfiguracji płatności.' }));
  }

  try {
    const { amount, isRecurring, name, email, marketingConsent } = req.body ?? {};

    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount < MIN_AMOUNT_PLN ||
      amount > MAX_AMOUNT_PLN
    ) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(
        JSON.stringify({
          error: `Kwota musi być liczbą z zakresu ${MIN_AMOUNT_PLN}-${MAX_AMOUNT_PLN} zł.`,
        })
      );
    }

    if (!isValidEmail(email)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Podaj prawidłowy adres e-mail.' }));
    }

    const safeName = typeof name === 'string' ? name.slice(0, 200) : undefined;

    // --- 1. MailerLite (Newsletter) ---
    if (marketingConsent === true) {
      try {
        const ML_API_KEY = process.env.MAILERLITE_API_KEY;
        const ALL_GROUP_ID = process.env.MAILERLITE_GROUP_ID;
        const DONORS_GROUP_ID = process.env.MAILERLITE_DONORS_GROUP_ID;

        if (ML_API_KEY) {
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
        }
      } catch (mlError) {
        console.error('Błąd zapisu do newslettera MailerLite:', mlError);
      }
    }

    // --- 2. Tworzenie Sesji Stripe ---
    const unitAmount = Math.round(amount * 100);
    const successUrl = `${SITE_URL}/dziekujemy`;
    const cancelUrl = `${SITE_URL}/#donate`;

    let session: Stripe.Checkout.Session;

    if (isRecurring) {
      const recurringProductId = process.env.STRIPE_RECURRING_PRODUCT_ID;
      if (!recurringProductId) {
        throw new Error('Brak konfiguracji STRIPE_RECURRING_PRODUCT_ID.');
      }

      const customers = await stripe.customers.list({ email, limit: 1 });
      const customer = customers.data[0] ?? (await stripe.customers.create({ email, name: safeName }));

      session = await stripe.checkout.sessions.create({
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
    } else {
      session = await stripe.checkout.sessions.create({
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

    if (!session.url) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Nie udało się utworzyć sesji płatności.' }));
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ url: session.url }));
  } catch (err) {
    console.error('Stripe handler error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Błąd serwera. Spróbuj ponownie.' }));
  }
}