import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEVELS = [
  { level: 1, percent: 5, minReferrals: 0 },
  { level: 2, percent: 7, minReferrals: 15 },
  { level: 3, percent: 15, minReferrals: 30 },
  { level: 4, percent: 20, minReferrals: 60 },
  { level: 5, percent: 25, minReferrals: 100 },
];

function getReferralPercent(referralCount: number): number {
  let percent = 5;
  for (const l of LEVELS) {
    if (referralCount >= l.minReferrals) percent = l.percent;
  }
  return percent;
}

async function addReferralEarnings(supabase: ReturnType<typeof createClient>, userId: string, earnedAmount: number) {
  const { data: user } = await supabase
    .from("users")
    .select("referred_by")
    .eq("id", userId)
    .single();

  if (!user?.referred_by) return;

  const { data: referrer } = await supabase
    .from("users")
    .select("referral_count, referral_earnings, balance")
    .eq("id", user.referred_by)
    .single();

  if (!referrer) return;

  const percent = getReferralPercent(referrer.referral_count);
  const bonus = Math.floor(earnedAmount * percent / 100);

  if (bonus > 0) {
    await supabase
      .from("users")
      .update({
        balance: referrer.balance + bonus,
        referral_earnings: referrer.referral_earnings + bonus,
      })
      .eq("id", user.referred_by);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, type } = await req.json(); // type: 'vazifa' | 'reklama'
    if (!userId || !type) throw new Error("userId and type required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    let earnedAmount = 0;

    if (type === "vazifa") {
      // 2-hour slots
      const h = now.getUTCHours() + 5;
      const adjustedH = h >= 24 ? h - 24 : h;
      const slot = Math.floor(adjustedH / 2) * 2;
      const slotKey = `${now.toISOString().split("T")[0]}-${slot}`;
      const maxAds = 10;

      const { count } = await supabase
        .from("ad_watch_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", type)
        .eq("slot_key", slotKey);

      const currentCount = count || 0;
      if (currentCount >= maxAds) {
        return new Response(
          JSON.stringify({ success: false, current: currentCount, max: maxAds }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("ad_watch_log").insert({
        user_id: userId,
        type,
        slot_key: slotKey,
      });

      const newCount = currentCount + 1;

      // Only give 70 tanga when 10/10 is complete
      if (newCount >= maxAds) {
        earnedAmount = 70;
        await supabase.rpc("add_balance", { p_user_id: userId, p_amount: 70 });
      }

      // Update ads_watched_total
      const { data: adUser } = await supabase.from("users").select("ads_watched_total").eq("id", userId).single();
      if (adUser) {
        await supabase.from("users").update({ ads_watched_total: adUser.ads_watched_total + 1 }).eq("id", userId);
      }

      // Add referral earnings if earned
      if (earnedAmount > 0) {
        await addReferralEarnings(supabase, userId, earnedAmount);
      }

      return new Response(
        JSON.stringify({ success: true, current: newCount, max: maxAds, earned: earnedAmount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "reklama") {
      // Unlimited ads - no slot limit
      // Just log it
      await supabase.from("ad_watch_log").insert({
        user_id: userId,
        type,
        slot_key: `reklama-${now.toISOString().split("T")[0]}`,
      });

      // Give 2 tickets immediately
      const { data: ticketUser } = await supabase.from("users").select("tickets").eq("id", userId).single();
      if (ticketUser) {
        await supabase.from("users").update({ tickets: ticketUser.tickets + 2 }).eq("id", userId);
      }

      // Update ads_watched_total
      const { data: adUser } = await supabase.from("users").select("ads_watched_total").eq("id", userId).single();
      if (adUser) {
        await supabase.from("users").update({ ads_watched_total: adUser.ads_watched_total + 1 }).eq("id", userId);
      }

      return new Response(
        JSON.stringify({ success: true, tickets: 2 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid type");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
