-- Panel administratora rozliczeń: adres e-mail wnioskodawcy, dane decyzji, status wysyłki powiadomienia.
-- Uruchom po 20261028_settlements.sql.

alter table public.settlements
  add column if not exists email         text,
  add column if not exists decided_at    timestamptz,
  add column if not exists decided_by    text,
  add column if not exists decision_note text,
  add column if not exists notified_at   timestamptz,
  add column if not exists notify_error  text;

alter table public.settlements drop constraint if exists settlements_email_format;
alter table public.settlements add constraint settlements_email_format check (
  email is null
  or (char_length(email) <= 254 and email ~ '^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$')
);

alter table public.settlements drop constraint if exists settlements_note_len;
alter table public.settlements add constraint settlements_note_len check (
  (decision_note is null or char_length(decision_note) <= 1000)
  and (notify_error is null or char_length(notify_error) <= 300)
);

-- Publiczny INSERT: adres e-mail wymagany, pola decyzji muszą być puste.
drop policy if exists settlements_insert_public on public.settlements;
create policy settlements_insert_public on public.settlements
  for insert to anon, authenticated
  with check (
    status = 'new'
    and email is not null
    and decided_at is null
    and decided_by is null
    and decision_note is null
    and notified_at is null
    and notify_error is null
  );

-- Zmiana statusu wyłącznie przez /api/decide-settlement (klucz service_role),
-- żeby każda decyzja przechodziła przez wysyłkę powiadomienia i zapis audytowy.
drop policy if exists settlements_admin_update on public.settlements;
