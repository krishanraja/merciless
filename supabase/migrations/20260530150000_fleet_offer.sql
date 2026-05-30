-- Fleet-writable offer overrides. A single row holding the mutable slice of the
-- product offer (price experiment arm, headline of the day, current promo) that
-- Maya can change with no deploy. The static product truth stays in
-- public/offer.json; the /functions/v1/offer endpoint merges this on top so the
-- fleet polls one live source. Discipline: a single JSON, never a CMS.

create table if not exists public.fleet_offer (
  id int primary key default 1,
  overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text,
  constraint fleet_offer_singleton check (id = 1)
);

insert into public.fleet_offer (id, overrides) values (1, '{}'::jsonb) on conflict (id) do nothing;

alter table public.fleet_offer enable row level security;
drop policy if exists "anon read fleet offer" on public.fleet_offer;
create policy "anon read fleet offer" on public.fleet_offer for select using (true);
-- Writes only via the service role (the offer-admin edge function).
