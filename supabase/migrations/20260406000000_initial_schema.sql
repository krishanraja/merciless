-- Merciless Initial Schema

CREATE TABLE IF NOT EXISTS user_birth_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  birth_date DATE NOT NULL,
  birth_time TIME,
  birth_location TEXT NOT NULL,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS natal_charts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  planets JSONB NOT NULL,
  houses JSONB NOT NULL,
  aspects JSONB NOT NULL,
  ascendant TEXT,
  midheaven TEXT,
  sun_sign TEXT,
  moon_sign TEXT,
  rising_sign TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_readings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reading_text TEXT NOT NULL,
  brutal_headline TEXT,
  stoic_actions JSONB,
  active_transits JSONB,
  planet_focus TEXT,
  intensity_level INTEGER CHECK (intensity_level BETWEEN 1 AND 10),
  shareable_card_data JSONB,
  is_free_tier BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reading_date)
);

CREATE TABLE IF NOT EXISTS oracle_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  session_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_birth_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE natal_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their birth data" ON user_birth_data FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their natal chart" ON natal_charts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their readings" ON daily_readings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their oracle chats" ON oracle_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their subscription" ON user_subscriptions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role full access - birth_data" ON user_birth_data FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access - natal_charts" ON natal_charts FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access - readings" ON daily_readings FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access - oracle" ON oracle_conversations FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access - subscriptions" ON user_subscriptions FOR ALL TO service_role USING (true);
