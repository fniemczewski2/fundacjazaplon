import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-02-25.clover',
});

// Stała, zaufana domena docelowa — NIGDY nie budujemy adresu przekierowania
// z nagłówka `Origin` żądania (ten nagłówek w pełni kontroluje klient, więc
// użycie go tutaj byłoby otwartym przekierowaniem: ktoś mógłby przekierować
// darczyńcę PO prawdziwej, opłaconej transakcji na dowolną domenę phishingową).
const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://zaplon.org.pl';

const MIN_AMOUNT_PLN = 1;
const MAX_AMOUNT_PLN = 50_000;

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda niedozwolona' });

  try {
    const { amount, isRecurring, name, email, marketingConsent } = req.body ?? {};

    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount < MIN_AMOUNT_PLN ||
      amount > MAX_AMOUNT_PLN
    ) {
      return res.status(400).json({ error: `Kwota musi być liczbą z zakresu ${MIN_AMOUNT_PLN}-${MAX_AMOUNT_PLN} zł.` });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Podaj prawidłowy adres e-mail.' });
    }
    const safeName = typeof name === 'string' ? name.slice(0, 200) : undefined;

    // --- 1. Zapis do MailerLite w tle — WYŁĄCZNIE jeśli darczyńca zaznaczył osobną
    //        zgodę marketingową (patrz DonateCard.tsx i raport audytu, pkt 5.3:
    //        zgoda na przetwarzanie w celu obsługi darowizny to inna podstawa prawna
    //        niż zgoda marketingowa i nie wolno ich łączyć w jedną, domyślną akcję).
    if (marketingConsent === true) {
      try {
        const ML_API_KEY = process.env.MAILERLITE_API_KEY;
        const ALL_GROUP_ID = process.env.MAILERLITE_GROUP_ID; // Grupa ogólna
        const DONORS_GROUP_ID = process.env.MAILERLITE_DONORS_GROUP_ID; // Nowa grupa darczyńców

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
        console.error('Błąd zapisu do newslettera:', mlError);
        // Ignorujemy błąd, aby pozwolić użytkownikowi dokończyć płatność
      }
    }

    // --- 2. Tworzenie Sesji Stripe ---
    const unitAmount = Math.round(amount * 100); // Stripe operuje w groszach
    const successUrl = `${SITE_URL}/dziekujemy`;
    const cancelUrl = `${SITE_URL}/#donate`;

    let session: Stripe.Checkout.Session;

    if (isRecurring) {
      // --- SUBSKRYPCJE ---
      const customers = await stripe.customers.list({ email, limit: 1 });
      const customer = customers.data[0] ?? (await stripe.customers.create({ email, name: safeName }));

      // Stały, jednorazowo utworzony produkt (ID w zmiennej środowiskowej) zamiast
      // wyszukiwania `products.list({ limit: 1 })` — to poprzednie podejście sprawdzało
      // WYŁĄCZNIE pierwszy produkt na koncie Stripe, więc jeśli nie pasował, tworzyło
      // nowy zamiast znaleźć właściwy dalej na liście, zaśmiecając konto duplikatami.
      // Dzięki `price_data` inline nie trzeba też trwale tworzyć obiektu Price za
      // każdym razem — Stripe Checkout przyjmuje cenę ad-hoc nawet w trybie subscription.
      const recurringProductId = process.env.STRIPE_RECURRING_PRODUCT_ID;
      if (!recurringProductId) {
        throw new Error('Brak konfiguracji STRIPE_RECURRING_PRODUCT_ID.');
      }

      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customer.id,
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
      return res.status(502).json({ error: 'Nie udało się utworzyć sesji płatności.' });
    }
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Błąd serwera. Spróbuj ponownie.' });
  }
}
