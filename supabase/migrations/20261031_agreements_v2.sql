-- Umowy i zgody v2: wzory fundacji, osoby małoletnie (rodzic / opiekun prawny), dwie osoby podpisujące za fundację.
-- Uruchom po 20261030_agreements.sql.

alter table public.agreements
  add column if not exists house_number           text,
  add column if not exists is_minor               boolean not null default false,
  add column if not exists guardian_first_name    text,
  add column if not exists guardian_last_name     text,
  add column if not exists guardian_email         text,
  add column if not exists guardian_phone         text,
  add column if not exists guardian_relation      text,
  add column if not exists conclusion_place       text,
  add column if not exists contract_number        text,
  add column if not exists costs_description      text,
  add column if not exists costs_days             integer,
  add column if not exists health_insurance_days  integer,
  add column if not exists rep_email              text,
  add column if not exists rep2_name              text,
  add column if not exists rep2_role              text,
  add column if not exists rep2_email             text,
  add column if not exists marketing_consent      boolean,
  add column if not exists declarations           jsonb,
  add column if not exists cosign1_at             timestamptz,
  add column if not exists cosign1_by             text,
  add column if not exists cosign2_at             timestamptz,
  add column if not exists cosign2_by             text;

alter table public.agreements drop constraint if exists agreements_v2_checks;
alter table public.agreements add constraint agreements_v2_checks check (
  (house_number is null or char_length(house_number) between 1 and 20)
  and (guardian_relation is null or guardian_relation in ('rodzic', 'opiekun prawny'))
  and (guardian_email is null or (char_length(guardian_email) <= 254 and guardian_email ~ '^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$'))
  and (guardian_first_name is null or char_length(guardian_first_name) between 1 and 100)
  and (guardian_last_name is null or char_length(guardian_last_name) between 1 and 100)
  and (guardian_phone is null or char_length(guardian_phone) between 5 and 30)
  and (conclusion_place is null or char_length(conclusion_place) <= 100)
  and (contract_number is null or char_length(contract_number) <= 40)
  and (costs_description is null or char_length(costs_description) <= 500)
  and (costs_days is null or costs_days between 1 and 90)
  and (health_insurance_days is null or health_insurance_days between 0 and 90)
  -- osoba małoletnia: tylko wolontariat, wymaga danych rodzica / opiekuna, bez zbierania informacji o niekaralności
  and (not is_minor or (kind = 'volunteer' and guardian_email is not null and guardian_relation is not null))
  and (not (is_minor and minors_checks_required))
);
