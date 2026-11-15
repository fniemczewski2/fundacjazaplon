-- Edytowalna lista linków strony /links (kolejność, widoczność, treść). Uruchom po 20261113_staff_roles.sql.
-- Zastosuj PRZED wdrożeniem nowej wersji aplikacji: strona /links czyta tę tabelę.

create table if not exists public.link_items (
  id          uuid primary key default gen_random_uuid(),
  -- link: zwykły adres; donate/newsletter: otwierają okno na stronie; join/instagram/linkedin: adres pochodzi z ustawień
  -- (ankieta „Dołącz do nas”, linki społecznościowe), a pozycja znika, gdy adresu brak.
  kind        text not null default 'link' check (kind in ('link', 'donate', 'newsletter', 'join', 'instagram', 'linkedin')),
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 200),
  url         text check (
    url is null or (char_length(url) <= 500 and url ~ '^(https?://[^[:space:]]+|/[^/[:space:]][^[:space:]]*|/)$')
  ),
  icon        text not null default 'link' check (
    icon in ('link', 'clipboard', 'download', 'globe', 'envelope', 'heart', 'user-plus', 'instagram', 'linkedin')
  ),
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (kind <> 'link' or url is not null)
);
create index if not exists link_items_order_idx on public.link_items (sort_order);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists link_items_touch on public.link_items;
create trigger link_items_touch before update on public.link_items
  for each row execute function public.touch_updated_at();

alter table public.link_items enable row level security;
drop policy if exists link_items_read on public.link_items;
drop policy if exists link_items_staff_insert on public.link_items;
drop policy if exists link_items_staff_update on public.link_items;
drop policy if exists link_items_admin_delete on public.link_items;
create policy link_items_read on public.link_items
  for select to anon, authenticated using (active or public.is_staff());
create policy link_items_staff_insert on public.link_items
  for insert to authenticated with check (public.is_staff());
create policy link_items_staff_update on public.link_items
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy link_items_admin_delete on public.link_items
  for delete to authenticated using (public.is_admin());

-- Dotychczasowa zawartość strony /links (tylko przy pustej tabeli).
insert into public.link_items (kind, title, description, url, icon, sort_order)
select v.kind, v.title, v.description, v.url, v.icon, v.sort_order
from (values
  ('link',       'Warsztaty Akademia Młodych Liderów', 'Zapisz się na warsztaty i działaj skuteczniej',    'https://forms.cloud.microsoft/e/E7Dt1qDqm4', 'clipboard',  1),
  ('link',       'Aktywny Samorząd Uczniowski',        'Zapisz się do programu i zgłoś swój samorząd',    'https://forms.cloud.microsoft/e/mSaJs7P03a', 'clipboard',  2),
  ('link',       'Bezpłatne materiały',                'Poradniki do pobrania',                           '/materialy',                                 'download',   3),
  ('donate',     'Wpłacam darowiznę',                  'Wspieram wasze działania',                        null,                                         'heart',      4),
  ('newsletter', E'Zapisuję się do newslettera',  'Chcę być na bieżąco',                             null,                                         'envelope',   5),
  ('join',       E'Dołączam do wolontariatu',     'Jestem częścią zmiany',                           null,                                         'user-plus',  6),
  ('instagram',  'Instagram',                          '@fundacjazaplon',                                 null,                                         'instagram',  7),
  ('linkedin',   'LinkedIn',                           'Obserwuj nas',                                    null,                                         'linkedin',   8),
  ('link',       'zaplon.org.pl',                      'Nasza strona główna',                             'https://zaplon.org.pl',                      'globe',      9)
) as v(kind, title, description, url, icon, sort_order)
where not exists (select 1 from public.link_items);
