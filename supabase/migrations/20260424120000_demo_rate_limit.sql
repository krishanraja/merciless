-- Demo-reading rate limiting: Postgres-backed so state survives cold starts
-- and can't be bypassed by rotating edge-function instances.

create table if not exists public.demo_rate_limit (
  fingerprint text primary key,
  count int not null default 0,
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demo_rate_limit_updated_at_idx
  on public.demo_rate_limit (updated_at);

-- Daily global cap table: one row per UTC day, service role increments.
create table if not exists public.demo_global_budget (
  day date primary key,
  count int not null default 0,
  updated_at timestamptz not null default now()
);

-- RLS: table is service-role only. No anon/auth access at all.
alter table public.demo_rate_limit enable row level security;
alter table public.demo_global_budget enable row level security;

-- Atomic per-fingerprint increment within an hourly window.
-- Resets the counter when the window has elapsed. Returns the new count.
create or replace function public.demo_rate_limit_bump(
  p_fingerprint text,
  p_window_seconds int default 3600
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.demo_rate_limit (fingerprint, count, window_start, updated_at)
  values (p_fingerprint, 1, now(), now())
  on conflict (fingerprint) do update
    set
      count = case
        when public.demo_rate_limit.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
        else public.demo_rate_limit.count + 1
      end,
      window_start = case
        when public.demo_rate_limit.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else public.demo_rate_limit.window_start
      end,
      updated_at = now()
  returning count into v_count;

  return v_count;
end;
$$;

-- Atomic global daily counter.
create or replace function public.demo_global_budget_bump()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.demo_global_budget (day, count)
  values ((now() at time zone 'utc')::date, 1)
  on conflict (day) do update
    set count = public.demo_global_budget.count + 1,
        updated_at = now()
  returning count into v_count;

  return v_count;
end;
$$;

-- Only service role can call these functions from edge functions.
revoke execute on function public.demo_rate_limit_bump(text, int) from public, anon, authenticated;
revoke execute on function public.demo_global_budget_bump() from public, anon, authenticated;
grant execute on function public.demo_rate_limit_bump(text, int) to service_role;
grant execute on function public.demo_global_budget_bump() to service_role;
