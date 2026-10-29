-- Umowy i zgody: zgłoszenie, zatwierdzenie przez administratora, zgody, KRK, podpis elektroniczny.
-- Uruchom po 20261029_settlements_admin.sql (korzysta z public.is_admin()).
--
-- Wszystkie zapisy i odczyty publiczne idą przez /api/agreement-public (klucz service_role). Anon nie ma
-- do tych tabel żadnego dostępu. Administrator może tylko czytać (panel); zmiany robi wyłącznie API,
-- żeby każda decyzja zostawiała ślad w agreement_events.
--
-- Uwaga: tabela zawiera PESEL. Dostęp do niej powinien mieć tylko administrator (RLS poniżej).

create table if not exists public.agreements (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  kind          text not null check (kind in ('volunteer', 'mandate')),
  status        text not null default 'submitted'
                check (status in ('submitted', 'approved', 'rejected', 'signed', 'completed')),

  -- dane ze zgłoszenia
  first_name    text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name     text not null check (char_length(btrim(last_name))  between 1 and 100),
  email         text not null check (char_length(email) <= 254 and email ~ '^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$'),
  phone         text check (phone is null or char_length(phone) between 5 and 30),
  pesel         text not null check (pesel ~ '^[0-9]{11}$'),
  birth_date    date not null,
  street        text not null check (char_length(btrim(street)) between 1 and 150),
  postal_code   text not null check (postal_code ~ '^[0-9]{2}-[0-9]{3}$'),
  city          text not null check (char_length(btrim(city)) between 1 and 100),
  note          text check (note is null or char_length(note) <= 1000),

  -- warunki ustalane przez administratora przy zatwierdzeniu
  scope         text check (scope is null or char_length(scope) between 3 and 1000),
  start_date    date,
  end_date      date,
  place         text check (place is null or char_length(place) <= 200),
  notice_days   integer check (notice_days is null or notice_days between 0 and 90),
  rate_type     text check (rate_type is null or rate_type in ('total', 'hourly')),
  rate_grosze   integer check (rate_grosze is null or rate_grosze between 1 and 100000000),
  payment_days  integer check (payment_days is null or payment_days between 1 and 60),
  minors_checks_required boolean not null default false,
  rep_name      text check (rep_name is null or char_length(rep_name) <= 150),
  rep_role      text check (rep_role is null or char_length(rep_role) <= 100),

  -- decyzja o zgłoszeniu
  decided_at    timestamptz,
  decided_by    text,
  decision_note text check (decision_note is null or char_length(decision_note) <= 1000),

  -- dostęp użytkownika (przechowujemy wyłącznie skrót tokenu)
  token_hash       text unique,
  token_expires_at timestamptz,

  -- zgody i oświadczenia
  consent_image        boolean,
  consent_rspts        boolean,
  info_clause_ack_at   timestamptz,
  contractor_statement jsonb,
  consents_saved_at    timestamptz,

  -- KRK i rejestr
  krk_file_path       text,
  krk_issue_date      date,
  krk_uploaded_at     timestamptz,
  krk_verified_at     timestamptz,
  krk_verified_by     text,
  krk_file_deleted_at timestamptz,
  rspts_verified_at   timestamptz,
  rspts_verified_by   text,

  -- podpis elektroniczny
  otp_hash         text,
  otp_expires_at   timestamptz,
  otp_attempts     integer not null default 0,
  otp_sent_at      timestamptz,
  signed_at        timestamptz,
  signed_ip        text,
  signed_ua        text,
  content_sha256   text,
  signed_file_path text,
  file_sha256      text,
  template_version text,
  template_approved boolean,
  countersigned_at timestamptz,
  countersigned_by text,

  last_email_error text check (last_email_error is null or char_length(last_email_error) <= 300)
);

create index if not exists agreements_status_idx on public.agreements (status, created_at desc);

alter table public.agreements enable row level security;

drop policy if exists agreements_admin_select on public.agreements;
create policy agreements_admin_select on public.agreements
  for select to authenticated using (public.is_admin());

create table if not exists public.agreement_events (
  id           bigint generated always as identity primary key,
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  at           timestamptz not null default now(),
  actor        text not null,
  event        text not null,
  details      jsonb
);

create index if not exists agreement_events_agreement_idx on public.agreement_events (agreement_id, at);

alter table public.agreement_events enable row level security;

drop policy if exists agreement_events_admin_select on public.agreement_events;
create policy agreement_events_admin_select on public.agreement_events
  for select to authenticated using (public.is_admin());

-- Prywatny bucket: informacje z KRK (krk/<id>.pdf) i podpisane dokumenty (signed/<id>.pdf, final/<id>.pdf).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agreements', 'agreements', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['application/pdf'];

-- Zapis do bucketu tylko przez API (service_role). Administrator może pobierać pliki.
drop policy if exists agreements_files_admin_select on storage.objects;
create policy agreements_files_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'agreements' and public.is_admin());
