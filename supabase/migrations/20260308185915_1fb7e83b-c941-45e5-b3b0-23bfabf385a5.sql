
-- Drop the restrictive SELECT policy and recreate as permissive
DROP POLICY IF EXISTS "Anon can read ad log" ON public.ad_watch_log;
CREATE POLICY "Anon can read ad log" ON public.ad_watch_log FOR SELECT USING (true);
