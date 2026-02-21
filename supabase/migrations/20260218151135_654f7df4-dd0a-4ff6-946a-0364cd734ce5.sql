
-- Team game rounds (every 20 minutes)
CREATE TABLE public.team_game_rounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  winning_team text, -- 'red' or 'blue' or null
  red_ads integer NOT NULL DEFAULT 0,
  blue_ads integer NOT NULL DEFAULT 0,
  red_prize integer NOT NULL DEFAULT 0,
  blue_prize integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' -- 'active' or 'completed'
);

-- Team game players per round
CREATE TABLE public.team_game_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id uuid NOT NULL REFERENCES public.team_game_rounds(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  team text NOT NULL, -- 'red' or 'blue'
  ads_watched integer NOT NULL DEFAULT 0,
  prize integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(round_id, user_id)
);

-- Enable RLS
ALTER TABLE public.team_game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_game_players ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read rounds" ON public.team_game_rounds FOR SELECT USING (true);
CREATE POLICY "Service role manages rounds" ON public.team_game_rounds FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read players" ON public.team_game_players FOR SELECT USING (true);
CREATE POLICY "Service role manages players" ON public.team_game_players FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_team_game_players_round ON public.team_game_players(round_id);
CREATE INDEX idx_team_game_players_user ON public.team_game_players(user_id);
CREATE INDEX idx_team_game_rounds_status ON public.team_game_rounds(status);
