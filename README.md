# Fundacja Zapłon

Strona WWW i panel administracyjny Fundacji Zapłon.

## Stos

- Vite 8, React 19, TypeScript, Tailwind v4, wouter, TanStack Query
- Supabase (auth, Postgres z RLS, storage)
- Lint: oxlint (`npm run lint`); ESLint usunięty (nieobsługiwana wersja, podatny łańcuch typescript-eslint).
- Vercel (hosting + funkcje w `api/`), Stripe, Microsoft Graph (poczta), MailerLite, Cloudflare Turnstile

## Uruchomienie

```
npm ci
cp .env.example .env.local   # uzupełnić wartości
npm run dev
```

## Skrypty

| Skrypt               | Opis                                                          |
| -------------------- | ------------------------------------------------------------- |
| `npm run dev`        | serwer deweloperski                                           |
| `npm run typecheck`  | sprawdzenie typów                                             |
| `npm run lint`       | oxlint                                                        |
| `npm run format`     | Prettier (tylko sprawdzenie)                                  |
| `npm run test`       | testy jednostkowe (vitest): `shared/`, `api/`, `src/lib/`     |
| `npm run test:watch` | testy w trybie obserwacji                                     |
| `npm run build`      | typecheck + build produkcyjny                                 |
| `npm run release`    | sprawdzenia, podniesienie wersji, commit i push (patrz niżej) |

### Wydanie (`scripts/release.mjs`)

Kolejno: Prettier (tylko zmienione pliki), lint, typecheck, testy, build; potem podniesienie wersji w `package.json` i `package-lock.json`, podsumowanie, pytanie o potwierdzenie, commit i push.

| Opcja                 | Działanie                                                                  |
| --------------------- | -------------------------------------------------------------------------- |
| (brak)                | wersja patch (x.y.**Z**)                                                   |
| `--minor` / `--major` | podniesienie wersji minor / major                                          |
| `--yes`               | bez pytania o potwierdzenie                                                |
| `--dry-run`           | tylko sprawdzenia i podgląd, bez zapisu, commita i pushu                   |
| `--only=lint,test`    | tylko wybrane sprawdzenia (`format`, `lint`, `typecheck`, `test`, `build`) |

Nowe pliki w `supabase/migrations/` są wypisywane w podsumowaniu: uruchom je w Supabase przed wdrożeniem kodu.

## Baza danych

Migracje w `supabase/migrations/`. Migrację `20261112_hardening.sql` zastosować przed wdrożeniem kodu.

Istniejące numery PESEL zaszyfrować jednorazowo:

```
node --experimental-strip-types scripts/encrypt-existing-pesel.ts
```

## Logowanie i role

Panel: wyłącznie logowanie kontem Microsoft (Supabase Auth, dostawca Azure). Dostęp ma konto w domenie `@zaplon.org.pl` z nadaną rolą.

| Rola                | Zakres                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Super administrator | adres w `SUPER_ADMIN_EMAIL`; nadaje role w panelu (Uprawnienia); uprawnienia administratora      |
| Administrator       | zatwierdza rozliczenia i umowy, podpisuje umowy za fundację, usuwa treści; uprawnienia redaktora |
| Redaktor            | dodaje i edytuje treści strony (aktualności, zespół, strony, materiały, media, dokumenty)        |

Konto bez roli widzi komunikat o oczekiwaniu na uprawnienia. Role egzekwuje baza (RLS, funkcje `staff_role()`, `is_staff()`, `is_admin()`) oraz API.

Konfiguracja jednorazowa:

1. Microsoft Entra ID: rejestracja aplikacji jednodzierżawczej (single tenant), redirect URI `https://<projekt>.supabase.co/auth/v1/callback`, sekret klienta.
2. Supabase: Authentication, Providers, Azure: Client ID, Secret, Azure Tenant URL `https://login.microsoftonline.com/<tenant-id>/v2.0`. Wyłącz dostawcę Email (logowanie hasłem).
3. Supabase: Authentication, URL Configuration: dodaj `https://zaplon.org.pl/admin` do Redirect URLs.
   3a. Logowanie lokalne: dodaj `http://localhost:5173/admin` do Redirect URLs (adres przekierowania budowany jest z bieżącego origin). Adres w Entra bez zmian: zawsze callback Supabase. Używaj `http://localhost:5173`, nie `127.0.0.1`. `npm run dev` obsługuje też `/api/*`, więc potrzebne są lokalne zmienne z `.env.example` (w tym `SUPER_ADMIN_EMAIL`).
4. Ustaw `SUPER_ADMIN_EMAIL` w Vercel i zastosuj migrację `20261113_staff_roles.sql`.

## Limity żądań i licznik OTP (Upstash Redis)

- Limity żądań publicznych (formularze, newsletter, darowizny, umowy, rozliczenia) oraz licznik prób kodu OTP działają w Upstash Redis (`@upstash/redis`, REST).
- Zmienne: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (alternatywnie `KV_REST_API_URL`, `KV_REST_API_TOKEN` z integracji Upstash w Vercel). Plan darmowy wystarcza.
- Brak Redis lub jego awaria: fail-closed. Funkcje publiczne zwracają 503, a podpis umowy jest niedostępny. Dotyczy też `npm run dev`, więc lokalnie ustaw zmienne (osobna baza Upstash do testów).
- Funkcje SQL `check_rate_limit` i `claim_otp_attempt` oraz tabela `rate_limits` nie są już używane. Można je usunąć po wdrożeniu (poza `security_events`, które nadal korzysta z Postgresa).

## Płatności (Stripe)

- Darowizny: Stripe Checkout (jednorazowa i miesięczna, kwota w PLN tworzona w locie). Bez webhooka i bez sekretu webhooka: strona `/dziekujemy` dostaje `session_id` w adresie, a serwer pyta Stripe o stan sesji w chwili żądania.
- Tryb produkcyjny: aplikacja akceptuje wyłącznie identyfikatory sesji `cs_live_`; nie ma obsługi trybu testowego.
- Wpłata cykliczna: każda tworzy nowego klienta Stripe. Przycisk na stronie podziękowania (`/api/stripe-portal`, ważny 24 h od sesji) otwiera panel klienta; później darczyńca korzysta ze strony `/subskrypcja` (logowanie kodem przez Stripe) albo prosi o anulowanie mailem.
- Panel `/admin/finanse` (rola admin): saldo Stripe, wpłaty cykliczne (aktywne i z nieudaną płatnością), wyszukiwanie, anulowanie.
- Konfiguracja w Stripe (Dashboard, tryb produkcyjny): Settings, Billing, Customer portal: włącz „Customers can cancel subscriptions” i login link; skopiuj adres logowania do `VITE_STRIPE_PORTAL_LOGIN_URL`.
- Klucz ograniczony (`rk_live_`) wymaga uprawnień: Checkout Sessions (zapis), Customers (zapis), Subscriptions (zapis), Customer portal (zapis), Balance (odczyt).
- Funkcje w `api/`: dodano `stripe-portal.ts` i `finance.ts` (razem 12 plików; limit planu Hobby w Vercel to 12).

## Zmienne środowiskowe

Pełna lista w `.env.example`. Bez `TURNSTILE_SECRET_KEY` weryfikacja captcha jest wyłączona.

## Wdrożenie

Vercel. Nagłówki bezpieczeństwa (CSP) w `vercel.json`; CSP zakłada `https://*.supabase.co`.
