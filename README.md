# Fundacja Zapłon

Strona WWW i panel administracyjny Fundacji Zapłon.

## Stos

- Vite 8, React 19, TypeScript, Tailwind v4, wouter, TanStack Query
- Supabase (auth, Postgres z RLS, storage)
- Vercel (hosting + funkcje w `api/`), Stripe, Microsoft Graph (poczta), MailerLite, Cloudflare Turnstile

## Uruchomienie

```
npm ci
cp .env.example .env.local   # uzupełnić wartości
npm run dev
```

## Skrypty

| Skrypt | Opis |
| --- | --- |
| `npm run dev` | serwer deweloperski |
| `npm run typecheck` | sprawdzenie typów |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (tylko sprawdzenie) |
| `npm run build` | typecheck + build produkcyjny |

## Baza danych

Migracje w `supabase/migrations/`. Migrację `20261112_hardening.sql` zastosować przed wdrożeniem kodu.

Istniejące numery PESEL zaszyfrować jednorazowo:

```
node --experimental-strip-types scripts/encrypt-existing-pesel.ts
```

## Zmienne środowiskowe

Pełna lista w `.env.example`. Bez `TURNSTILE_SECRET_KEY` weryfikacja captcha jest wyłączona.

## Wdrożenie

Vercel. Nagłówki bezpieczeństwa (CSP) w `vercel.json`; CSP zakłada `https://*.supabase.co`.
