
-- Helper function to add balance
CREATE OR REPLACE FUNCTION public.add_balance(p_user_id text, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users SET balance = balance + p_amount WHERE id = p_user_id;
END;
$$;

-- Helper function to increment referral count
CREATE OR REPLACE FUNCTION public.increment_referral(referrer_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users SET referral_count = referral_count + 1 WHERE id = referrer_id;
END;
$$;
