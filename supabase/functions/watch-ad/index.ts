import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

function getOyinSlotKey(): string {
  const now = new Date();
  const h = now.getUTCHours();
  const slot = now.getUTCMinutes() < 30 ? 0 : 30;
  return `oyin-${now.toISOString().split("T")[0]}-${h}-${slot}`;
}

// AI: Check if user is watching ads too fast (less than 7 seconds between ads)
async function checkAdSpeed(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: recentAds } = await supabase
    .from("ad_watch_log")
    .select("watched_at")
    .eq("user_id", userId)
    .order("watched_at", { ascending: false })
    .limit(2);

  if (!recentAds || recentAds.length < 2) return;

  const lastTime = new Date(recentAds[0].watched_at).getTime();
  const prevTime = new Date(recentAds[1].watched_at).getTime();
  const diffSeconds = (lastTime - prevTime) / 1000;

  if (diffSeconds < 7) {
    // Check if warning was already sent in last 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "warning")
      .gte("created_at", fiveMinAgo);

    if ((count || 0) === 0) {
      await supabase.from("notifications").insert({
        user_id: userId,
        title: "⚠️ AI nazorati",
        message: "Siz kamida 7 soniya reklama ko'rmayotgan ko'rinasiz. AI nazoratga olib tekshiryapti. Kamida 7 soniya ko'ring, aks holda AI avtomatik to'lovni rad etadi!",
        type: "warning",
      });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, type } = await req.json();
    if (!userId || !type) throw new Error("userId and type required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    let earnedAmount = 0;

    if (type === "vazifa") {
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

      if (newCount >= maxAds) {
        earnedAmount = 120;
        await supabase.rpc("add_balance", { p_user_id: userId, p_amount: 120 });
      }

      const { data: adUser } = await supabase.from("users").select("ads_watched_total").eq("id", userId).single();
      if (adUser) {
        await supabase.from("users").update({ ads_watched_total: adUser.ads_watched_total + 1 }).eq("id", userId);
      }

      if (earnedAmount > 0) {
        await addReferralEarnings(supabase, userId, earnedAmount);
      }

      await checkAdSpeed(supabase, userId);

      return new Response(
        JSON.stringify({ success: true, current: newCount, max: maxAds, earned: earnedAmount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "oyin") {
      const slotKey = getOyinSlotKey();
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

      if (newCount >= maxAds) {
        earnedAmount = 30;
        await supabase.rpc("add_balance", { p_user_id: userId, p_amount: 30 });
      }

      const { data: adUser } = await supabase.from("users").select("ads_watched_total").eq("id", userId).single();
      if (adUser) {
        await supabase.from("users").update({ ads_watched_total: adUser.ads_watched_total + 1 }).eq("id", userId);
      }

      if (earnedAmount > 0) {
        await addReferralEarnings(supabase, userId, earnedAmount);
      }

      await checkAdSpeed(supabase, userId);

      return new Response(
        JSON.stringify({ success: true, current: newCount, max: maxAds, earned: earnedAmount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "reklama") {
      await supabase.from("ad_watch_log").insert({
        user_id: userId,
        type,
        slot_key: `reklama-${now.toISOString().split("T")[0]}`,
      });

      const { data: ticketUser } = await supabase.from("users").select("tickets").eq("id", userId).single();
      if (ticketUser) {
        await supabase.from("users").update({ tickets: ticketUser.tickets + 2 }).eq("id", userId);
      }

      const { data: adUser } = await supabase.from("users").select("ads_watched_total").eq("id", userId).single();
      if (adUser) {
        await supabase.from("users").update({ ads_watched_total: adUser.ads_watched_total + 1 }).eq("id", userId);
      }

      await checkAdSpeed(supabase, userId);

      return new Response(
        JSON.stringify({ success: true, tickets: 2 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Bonus ads: 5 ads per 10-min slot, +2 bonus_balance each
    if (type === "bonus") {
      const h = now.getUTCHours() + 5;
      const adjustedH = h >= 24 ? h - 24 : h;
      const slot = Math.floor(now.getMinutes() / 10);
      const slotKey = `${type}-${now.toISOString().split("T")[0]}-${adjustedH}-${slot}`;
      const maxAds = 5;

      const { count } = await supabase
        .from("ad_watch_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", type)
        .eq("slot_key", slotKey);

      const currentCount = count || 0;
      if (currentCount >= maxAds) {
        return new Response(
          JSON.stringify({ success: false, error: "Limit tugadi! Keyingi davrani kuting.", current: currentCount, max: maxAds }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("ad_watch_log").insert({
        user_id: userId,
        type,
        slot_key: slotKey,
      });

      const { data: bonusUser } = await supabase.from("users").select("bonus_balance, ads_watched_total").eq("id", userId).single();
      if (bonusUser) {
        await supabase.from("users").update({
          bonus_balance: (bonusUser.bonus_balance || 0) + 2,
          ads_watched_total: bonusUser.ads_watched_total + 1,
        }).eq("id", userId);
      }

      await checkAdSpeed(supabase, userId);

      return new Response(
        JSON.stringify({ success: true, bonus: 2, current: currentCount + 1, max: maxAds }),
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
