-- Stripe webhook idempotency ledger. The webhook inserts the Stripe event id
-- before processing; a unique violation means the event was already handled, so
-- replays / retries / out-of-order deliveries never double-write subscriptions
-- or double-emit warehouse events. Service-role only.

create table if not exists public.stripe_processed_events (
  event_id text primary key,
  type text,
  processed_at timestamptz not null default now()
);

alter table public.stripe_processed_events enable row level security;
-- No policies: only the service role (webhook) touches this table.
