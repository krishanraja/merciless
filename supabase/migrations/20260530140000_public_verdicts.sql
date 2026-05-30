-- Public verdict share targets. Each shared reading or demo mints a row here
-- keyed by a random slug, so /v/{slug} can render a real, crawlable, unfurlable
-- page server-side. Deliberately holds NO user_id and no private reading text:
-- only the headline, signs, and a short excerpt the user chose to share. These
-- are public by design, so anon may read them; only the service role writes.

create table if not exists public.public_verdicts (
  slug text primary key,
  headline text not null,
  excerpt text,
  sun_sign text,
  moon_sign text,
  rising_sign text,
  kind text not null default 'reading', -- 'reading' | 'demo'
  created_at timestamptz not null default now()
);

alter table public.public_verdicts enable row level security;

drop policy if exists "Public read verdicts" on public.public_verdicts;
create policy "Public read verdicts" on public.public_verdicts
  for select using (true);
-- No insert/update/delete policy: writes happen only via the service role
-- (the daily-reading and demo-reading edge functions).

create index if not exists public_verdicts_created_idx on public.public_verdicts (created_at);
