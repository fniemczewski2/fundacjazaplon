import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-02-25.clover',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metoda niedozwolona' });

  try {
    const { amount, isRecurring, name, email } = req.body;

    if (!amount || amount <= 0 || !email) {
      return res.status(400).json({ error: 'Nieprawidłowe dane.' });
    }

    // --- 1. Zapis do MailerLite w tle (nie blokujemy działania Stripe w razie błędu ML) ---
    try {
      const ML_API_KEY = process.env.MAILERLITE_API_KEY;
      const ALL_GROUP_ID = process.env.MAILERLITE_GROUP_ID; // Grupa ogólna
      const DONORS_GROUP_ID = process.env.MAILERLITE_DONORS_GROUP_ID; // Nowa grupa darczyńców

      if (ML_API_KEY) {
        const groupsToJoin = [];
        if (ALL_GROUP_ID) groupsToJoin.push(ALL_GROUP_ID);
        if (DONORS_GROUP_ID) groupsToJoin.push(DONORS_GROUP_ID);

        await fetch('https://connect.mailerlite.com/api/subscribers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ML_API_KEY}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            email: email,
            fields: { name: name },
            groups: groupsToJoin.length > 0 ? groupsToJoin : undefined,
            status: 'active'
          }),
        });
      }
    } catch (mlError) {
      console.error('Błąd zapisu do newslettera:', mlError);
      // Ignorujemy błąd, aby pozwolić użytkownikowi dokończyć płatność
    }

    // --- 2. Tworzenie Sesji Stripe ---
    const unitAmount = Math.round(amount * 100); // Stripe operuje w groszach
    const successUrl = `${req.headers.origin || 'https://zaplon.org.pl'}/dziekujemy`;
    const cancelUrl = `${req.headers.origin || 'https://zaplon.org.pl'}/#donate`;

    let session;

    if (isRecurring) {
      // --- SUBSKRYPCJE: Tworzymy Klienta i Cenę dynamicznie w locie ---
      const customers = await stripe.customers.list({ email: email, limit: 1 });
      let customer = customers.data.length > 0 ? customers.data[0] : null;

      if (!customer) {
        customer = await stripe.customers.create({ email, name });
      }

      // Wyszukujemy lub tworzymy ukryty produkt "baza" dla subskrypcji
      const products = await stripe.products.list({ limit: 1, active: true });
      let product = products.data.find(p => p.metadata?.type === 'recurring_donation');

      if (!product) {
        product = await stripe.products.create({
          name: 'Regularne wsparcie Fundacji „Zapłon”',
          metadata: { type: 'recurring_donation' }
        });
      }

      // Generujemy konkretną cenę dla wybranej kwoty
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: 'pln',
        recurring: { interval: 'month' },
      });

      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customer.id,
        line_items: [{ price: price.id, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

    } else {
      // --- WPŁATY JEDNORAZOWE: Używamy zablokowanego price_data ---
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card', 'blik', 'p24'],
        customer_email: email,
        line_items: [{
          price_data: {
            currency: 'pln',
            product_data: { 
              name: 'Darowizna na rzecz Fundacji „Zapłon”',
              description: name ? `Wsparcie od: ${name}` : 'Dziękujemy!'
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
    }

    return res.status(200).json({ url: session.url });

  } catch (err: any) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: "Błąd serwera. Spróbuj ponownie." });
  }
}