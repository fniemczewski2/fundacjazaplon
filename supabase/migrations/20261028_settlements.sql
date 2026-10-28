-- Rozliczenia faktur: formularz publiczny (tylko INSERT), odczyt wyłącznie dla administratorów.
-- Uruchom w Supabase SQL Editor. Po uruchomieniu dodaj e-mail administratora:
--   insert into public.admin_emails (email) values ('twoj@adres.pl');

create table if not exists public.admin_emails (
  email text primary key
);
alter table public.admin_emails enable row level security;
-- brak polityk = brak dostępu przez API; czyta je tylko funkcja is_admin()

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.settlements (
  id            uuid primary key,
  created_at    timestamptz not null default now(),
  first_name    text not null check (char_length(btrim(first_name)) between 1 and 100),
  last_name     text not null check (char_length(btrim(last_name))  between 1 and 100),
  purpose       text not null check (char_length(btrim(purpose))    between 3 and 500),
  iban          text not null check (iban ~ '^PL[0-9]{26}$'),
  amount_grosze integer not null check (amount_grosze between 1 and 100000000),
  invoice_kind  text not null check (invoice_kind in ('pdf', 'ksef')),
  ksef_number   text,
  file_path     text,
  status        text not null default 'new' check (status in ('new', 'accepted', 'paid', 'rejected')),
  constraint settlements_one_source check (
    (invoice_kind = 'pdf'
      and file_path ~ '^[0-9a-f-]{36}\.pdf$'
      and ksef_number is null)
    or
    (invoice_kind = 'ksef'
      and ksef_number ~ '^[0-9]{10}-[0-9]{8}-[0-9A-F]{12}-[0-9A-F]{2}$'
      and file_path is null)
  )
);

alter table public.settlements enable row level security;

create policy settlements_insert_public on public.settlements
  for insert to anon, authenticated
  with check (status = 'new');

create policy settlements_admin_select on public.settlements
  for select to authenticated using (public.is_admin());
create policy settlements_admin_update on public.settlements
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settlements_admin_delete on public.settlements
  for delete to authenticated using (public.is_admin());

-- Prywatny bucket na faktury PDF (limit 10 MB, tylko application/pdf).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('settlements', 'settlements', false, 10485760, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf'];

create policy settlements_files_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'settlements' and name ~ '^[0-9a-f-]{36}\.pdf$');

create policy settlements_files_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'settlements' and public.is_admin());
create policy settlements_files_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'settlements' and public.is_admin());
