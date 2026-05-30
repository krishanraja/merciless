-- Phase 2: entitlement RLS fix + data-layer hardening. Idempotent.

-- 1. ENTITLEMENT (the live revenue leak). The old policy
--      CREATE POLICY "Users own their subscription" ON user_subscriptions
--        FOR ALL USING (auth.uid() = user_id);
--    let any authenticated user INSERT or UPDATE their own user_subscriptions
--    row to status='active' through the REST API and self-grant Pro. isPro, the
--    paywall, and the server-side Oracle gate all read that status. Clients may
--    now only READ their subscription. It is written exclusively by the Stripe
--    webhook running as the service role.
DROP POLICY IF EXISTS "Users own their subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users read their subscription" ON user_subscriptions;
CREATE POLICY "Users read their subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Defense in depth: make WITH CHECK explicit on the owner-writable tables so a
--    forged user_id can never be written, independent of Postgres USING fallback.
DROP POLICY IF EXISTS "Users own their birth data" ON user_birth_data;
CREATE POLICY "Users own their birth data" ON user_birth_data
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own their natal chart" ON natal_charts;
CREATE POLICY "Users own their natal chart" ON natal_charts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own their readings" ON daily_readings;
CREATE POLICY "Users own their readings" ON daily_readings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own their oracle chats" ON oracle_conversations;
CREATE POLICY "Users own their oracle chats" ON oracle_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Missing index: per-user oracle conversation lookups were a sequential scan.
CREATE INDEX IF NOT EXISTS oracle_conversations_user_id_idx ON oracle_conversations(user_id);

-- 4. updated_at was only ever set on INSERT. Maintain it on UPDATE.
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON user_birth_data;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_birth_data
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON oracle_conversations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON oracle_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON user_subscriptions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Generalized per-UTC-day global budget (a cost ceiling) reusable by any
--    public, unauthenticated, paid-API endpoint. transcribe-date uses the
--    'transcribe' bucket. Service-role only; RLS on with no policy = deny by
--    default for everyone else.
CREATE TABLE IF NOT EXISTS public.api_global_budget (
  bucket TEXT NOT NULL,
  day DATE NOT NULL DEFAULT (now() at time zone 'utc')::date,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket, day)
);
ALTER TABLE public.api_global_budget ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.api_global_budget_bump(p_bucket text) RETURNS int
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int;
  v_day date := (now() at time zone 'utc')::date;
BEGIN
  INSERT INTO public.api_global_budget (bucket, day, count, updated_at)
  VALUES (p_bucket, v_day, 1, now())
  ON CONFLICT (bucket, day) DO UPDATE
    SET count = public.api_global_budget.count + 1, updated_at = now()
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.api_global_budget_bump(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_global_budget_bump(text) TO service_role;
