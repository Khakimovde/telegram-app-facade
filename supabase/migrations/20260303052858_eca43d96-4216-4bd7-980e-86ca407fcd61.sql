
-- Add bonus_balance column to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bonus_balance integer NOT NULL DEFAULT 0;

-- Create app_settings table for admin toggles
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);

-- Service role manages settings
CREATE POLICY "Service role manages settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default bonus_day setting (off by default)
INSERT INTO public.app_settings (key, value) VALUES ('bonus_day_active', 'false') ON CONFLICT (key) DO NOTHING;
