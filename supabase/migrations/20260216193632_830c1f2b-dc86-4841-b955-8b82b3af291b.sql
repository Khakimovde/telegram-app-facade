
-- ============================
-- AdoraPay Database Schema
-- ============================

-- Users table (Telegram ID as primary key)
CREATE TABLE public.users (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  username text NOT NULL DEFAULT '',
  balance integer NOT NULL DEFAULT 0,
  referral_count integer NOT NULL DEFAULT 0,
  referral_earnings integer NOT NULL DEFAULT 0,
  referred_by text REFERENCES public.users(id),
  level integer NOT NULL DEFAULT 1,
  ads_watched_total integer NOT NULL DEFAULT 0,
  auction_wins integer NOT NULL DEFAULT 0,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Withdraw requests
CREATE TABLE public.withdraw_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users(id),
  tanga integer NOT NULL,
  som integer NOT NULL,
  card text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Channel tasks
CREATE TABLE public.channel_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  username text NOT NULL,
  reward integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true
);

-- User channel completions
CREATE TABLE public.user_channel_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users(id),
  channel_task_id uuid NOT NULL REFERENCES public.channel_tasks(id),
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_task_id)
);

-- Ad watch log
CREATE TABLE public.ad_watch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users(id),
  type text NOT NULL, -- 'vazifa' | 'reklama'
  slot_key text NOT NULL,
  watched_at timestamptz NOT NULL DEFAULT now()
);

-- Auction entries
CREATE TABLE public.auction_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users(id),
  tickets integer NOT NULL,
  hour_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auction results
CREATE TABLE public.auction_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users(id),
  hour_key text NOT NULL,
  tickets_used integer NOT NULL,
  won boolean NOT NULL DEFAULT false,
  prize integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================
-- RLS Policies
-- ============================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_channel_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_watch_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_results ENABLE ROW LEVEL SECURITY;

-- Since this is a Telegram mini app without Supabase Auth,
-- all data access happens through edge functions with service_role key.
-- RLS policies allow edge functions (service_role) full access,
-- and anon key gets read access to public data.

-- Users: anon can read (for leaderboard), service_role manages everything
CREATE POLICY "Anyone can read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Service role manages users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Withdraw requests: anon reads own (via edge function), service_role manages
CREATE POLICY "Service role manages withdrawals" ON public.withdraw_requests FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon can read withdrawals" ON public.withdraw_requests FOR SELECT USING (true);

-- Channel tasks: everyone reads, service_role manages
CREATE POLICY "Anyone can read channel tasks" ON public.channel_tasks FOR SELECT USING (true);
CREATE POLICY "Service role manages channel tasks" ON public.channel_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User channel completions
CREATE POLICY "Service role manages completions" ON public.user_channel_completions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon can read completions" ON public.user_channel_completions FOR SELECT USING (true);

-- Ad watch log
CREATE POLICY "Service role manages ad log" ON public.ad_watch_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon can read ad log" ON public.ad_watch_log FOR SELECT USING (true);

-- Auction entries
CREATE POLICY "Service role manages auction entries" ON public.auction_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon can read auction entries" ON public.auction_entries FOR SELECT USING (true);

-- Auction results
CREATE POLICY "Service role manages auction results" ON public.auction_results FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon can read auction results" ON public.auction_results FOR SELECT USING (true);

-- Enable realtime for withdraw_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdraw_requests;

-- Insert default channel tasks
INSERT INTO public.channel_tasks (name, username, reward) VALUES
  ('Adora Pay', '@AdoraPay_uz', 100),
  ('UzbekEarn', '@UzbekEarn', 50),
  ('Bonus Club', '@BonusClub_uz', 75);
