
-- Add photo_url and tickets columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo_url text DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tickets integer NOT NULL DEFAULT 0;
