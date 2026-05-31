-- Retention + lead-signal layer for push (#16), weekly digest (#20), and the
-- consented transit-timed re-engagement (#17). Idempotent.

-- Web-push subscriptions (one device per endpoint). Clients manage their own.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push subs" on public.push_subscriptions;
create policy "own push subs" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notification consent + channels. One row per user. Clients manage their own.
create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default false,
  email_enabled boolean not null default false,
  transit_alerts boolean not null default false,
  utc_offset_minutes integer not null default 0,
  unsubscribed boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists "own notif prefs" on public.notification_prefs;
create policy "own notif prefs" on public.notification_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists set_updated_at on public.notification_prefs;
create trigger set_updated_at before update on public.notification_prefs
  for each row execute function public.set_updated_at();

-- Consented leads from the public demo (the stalled-demo re-engagement, #17).
-- Anonymous people who opted in to be told when their chart goes loud. Written
-- only by the service role (the lead-capture edge fn); never client-readable.
create table if not exists public.lead_signals (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  mcl_cid text,
  sun_sign text,
  birth_date date,
  source text not null default 'demo',
  consented_at timestamptz not null default now(),
  last_contacted_at timestamptz,
  unsubscribed boolean not null default false,
  unsubscribe_token text not null default replace(gen_random_uuid()::text,'-',''),
  unique (email)
);
alter table public.lead_signals enable row level security;
-- No policies: service role only.
