import Stripe from 'stripe';

let instance: Stripe | null = null;

/** Klient Stripe (klucz produkcyjny `sk_live_` albo ograniczony `rk_live_`) albo null, gdy brak STRIPE_SECRET_KEY. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  instance ??= new Stripe(key);
  return instance;
}

/** Identyfikator sesji Checkout (tylko produkcyjne `cs_live_`). Zwracany Stripe'owi dopiero po tej walidacji. */
export const CHECKOUT_SESSION_RE = /^cs_live_[A-Za-z0-9]{10,250}$/;

/** Link do zarządzania wpłatą z podziękowania wygasa po 24 godzinach od utworzenia sesji. */
export const MANAGE_LINK_TTL_SECONDS = 24 * 60 * 60;
