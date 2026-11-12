-- Utwardzenie: limity żądań, dziennik zdarzeń bezpieczeństwa, atomowy licznik prób OTP,
-- zamknięcie anonimowego zapisu rozliczeń (zapis tylko przez /api/submit-settlement) oraz
-- szyfrowanie numerów PESEL po stronie aplikacji.
-- Uruchom po 20261031_agreements_v2.sql. Zastosuj PRZED wdrożeniem nowej wersji aplikacji albo razem z nim.

-- 1. Limity żądań ---------------------------------------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         integer not null default 0
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Zwraca true, gdy żądanie mieści się w limicie. Okno resetuje się po p_window_seconds od pierwszego żądania.
create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end,
        hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end
  returning hits into current_hits;

  -- Sporadyczne sprzątanie nieaktywnych kluczy.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return current_hits <= p_limit;
end;
$$;
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- 2. Dziennik zdarzeń bezpieczeństwa ----------------------------------------------------------------------------
create table if not exists public.security_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type       text not null,
  ip_hash    text,
  details    jsonb not null default '{}'::jsonb
);
create index if not exists security_events_created_idx on public.security_events (created_at desc);
alter table public.security_events enable row level security;
drop policy if exists security_events_admin_select on public.security_events;
create policy security_events_admin_select on public.security_events
  for select to authenticated using (public.is_admin());

-- 3. Atomowe zużycie próby OTP --------------------------------------------------------------------------------
-- Zwraca numer zużytej próby (1..p_max) albo NULL, gdy limit został wyczerpany. Wyścig równoległych żądań
-- nie pozwala przekroczyć limitu, bo zwiększenie i sprawdzenie to jedna instrukcja UPDATE.
create or replace function public.claim_otp_attempt(p_id uuid, p_max integer)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.agreements
     set otp_attempts = otp_attempts + 1
   where id = p_id and otp_attempts < p_max
  returning otp_attempts;
$$;
revoke all on function public.claim_otp_attempt(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_otp_attempt(uuid, integer) to service_role;

-- 4. Rozliczenia: zapis wyłącznie przez serwer (captcha, limity, walidacja) ---------------------------------------
drop policy if exists settlements_insert_public on public.settlements;
drop policy if exists settlements_files_insert on storage.objects;

-- 5. PESEL zaszyfrowany w aplikacji (AES-256-GCM, prefiks enc:v1:) ---------------------------------------------
alter table public.agreements drop constraint if exists agreements_pesel_check;
alter table public.agreements
  add constraint agreements_pesel_check check (pesel ~ '^[0-9]{11}$' or pesel like 'enc:v1:%');
