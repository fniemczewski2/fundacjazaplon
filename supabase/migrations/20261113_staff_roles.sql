-- Role personelu panelu: super_admin (z zmiennej SUPER_ADMIN_EMAIL, synchronizowany przez API), admin, editor.
-- Uruchom po 20261112_hardening.sql. Przed uruchomieniem zapisz bieżące polityki:
--   select schemaname, tablename, policyname, cmd, roles, qual, with_check from pg_policies
--   where schemaname in ('public','storage') order by 1, 2, 3;
-- Migracja zastępuje polityki zapisu na tabelach treści i na koszykach media/documents (patrz sekcja 4 i 5).

-- 1. Tabela ról ----------------------------------------------------------------------------------------------
create table if not exists public.staff_roles (
  email      text primary key check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+$'),
  role       text not null check (role in ('editor', 'admin', 'super_admin')),
  granted_by text,
  granted_at timestamptz not null default now()
);
alter table public.staff_roles enable row level security;
-- brak polityk = brak dostępu przez API; tabelę czytają funkcje SECURITY DEFINER i klucz service_role
revoke all on table public.staff_roles from anon, authenticated;

-- Najwyżej jeden super administrator.
create unique index if not exists staff_roles_single_super on public.staff_roles ((role)) where role = 'super_admin';

-- 2. Funkcje pomocnicze (używane przez RLS i przez API) ---------------------------------------------------------
-- Rola wynika z adresu e-mail w tokenie i wpisu w staff_roles. Konto spoza domeny zaplon.org.pl nie ma roli,
-- chyba że jest super administratorem (adres ustawia właściciel serwera w SUPER_ADMIN_EMAIL).
create or replace function public.staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.role
  from public.staff_roles r
  where r.email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and (r.role = 'super_admin' or r.email like '%@zaplon.org.pl');
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select public.staff_role() is not null; $$;

-- Zachowuje nazwę z wcześniejszych migracji: administrator = admin albo super_admin.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.staff_role() in ('admin', 'super_admin'), false); $$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.staff_role() = 'super_admin', false); $$;

revoke all on function public.staff_role(), public.is_staff(), public.is_admin(), public.is_super_admin() from public;
grant execute on function public.staff_role(), public.is_staff(), public.is_admin(), public.is_super_admin()
  to anon, authenticated;

-- 3. Przeniesienie dotychczasowych administratorów z domeny zaplon.org.pl --------------------------------------
do $$
begin
  if to_regclass('public.admin_emails') is not null then
    insert into public.staff_roles (email, role, granted_by)
    select lower(email), 'admin', 'migracja z admin_emails'
    from public.admin_emails
    where lower(email) like '%@zaplon.org.pl'
    on conflict (email) do nothing;
  end if;
end $$;
-- Tabela admin_emails nie jest już używana. Po sprawdzeniu migracji można ją usunąć: drop table public.admin_emails;

-- 4. Tabele treści strony: odczyt publiczny, zapis redaktor, usuwanie administrator -----------------------------
do $$
declare
  t record;
  p record;
begin
  for t in
    select * from (values
      ('posts',         'published_at is not null and published_at <= now()'),
      ('team_members',  'active'),
      ('about_info',    'true'),
      ('about_pillars', 'true'),
      ('contact_info',  'true'),
      ('join_us',       'true'),
      ('materials',     'true'),
      ('single_pages',  'true'),
      ('social_links',  'true')
    ) as v(name, read_expr)
  loop
    if to_regclass('public.' || t.name) is null then
      raise notice 'Pominięto brakującą tabelę %', t.name;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t.name);

    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t.name loop
      execute format('drop policy %I on public.%I', p.policyname, t.name);
    end loop;

    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (%s or public.is_staff())',
      t.name || '_read', t.name, t.read_expr);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_staff())',
      t.name || '_staff_insert', t.name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_staff()) with check (public.is_staff())',
      t.name || '_staff_update', t.name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_admin())',
      t.name || '_admin_delete', t.name);
  end loop;
end $$;

-- 5. Koszyki plików strony (media, documents): dodawanie i podmiana redaktor, usuwanie administrator -------------
-- Zastępowane są polityki zapisu, które odwołują się do tych koszyków. Polityki odczytu pozostają bez zmian.
do $$
declare
  b text;
  p record;
begin
  foreach b in array array['media', 'documents'] loop
    for p in
      select policyname from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and cmd <> 'SELECT'
        and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) like '%' || quote_literal(b) || '%'
    loop
      execute format('drop policy %I on storage.objects', p.policyname);
    end loop;

    execute format('drop policy if exists %I on storage.objects', b || '_staff_read');
    execute format('drop policy if exists %I on storage.objects', b || '_staff_insert');
    execute format('drop policy if exists %I on storage.objects', b || '_staff_update');
    execute format('drop policy if exists %I on storage.objects', b || '_admin_delete');

    execute format(
      'create policy %I on storage.objects for select to authenticated using (bucket_id = %L and public.is_staff())',
      b || '_staff_read', b);
    execute format(
      'create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L and public.is_staff())',
      b || '_staff_insert', b);
    execute format(
      'create policy %I on storage.objects for update to authenticated using (bucket_id = %L and public.is_staff()) with check (bucket_id = %L and public.is_staff())',
      b || '_staff_update', b, b);
    execute format(
      'create policy %I on storage.objects for delete to authenticated using (bucket_id = %L and public.is_admin())',
      b || '_admin_delete', b);
  end loop;
end $$;
