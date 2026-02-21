import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve active round
    const { data: round } = await supabase
      .from("team_game_rounds")
      .select("*")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (!round) {
      // Create a new round if none exists
      await supabase.from("team_game_rounds").insert({ status: "active" });
      return new Response(JSON.stringify({ message: "Created new round" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if round started before current 30-min slot
    const now = new Date();
    const currentSlotMin = now.getUTCMinutes() < 30 ? 0 : 30;
    const slotStart = new Date(now);
    slotStart.setUTCMinutes(currentSlotMin, 0, 0);
    
    const startedAt = new Date(round.started_at).getTime();
    if (startedAt >= slotStart.getTime()) {
      return new Response(JSON.stringify({ message: "Round still active for this slot" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the round
    const totalAds = round.red_ads + round.blue_ads;
    let winningTeam: string;

    if (totalAds === 0) {
      winningTeam = Math.random() < 0.5 ? "red" : "blue";
    } else {
      const redChance = round.red_ads / totalAds;
      winningTeam = Math.random() < redChance ? "red" : "blue";
    }

    const winPrize = 30;
    const losePrize = 10;

    await supabase
      .from("team_game_rounds")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        winning_team: winningTeam,
        red_prize: winningTeam === "red" ? winPrize : losePrize,
        blue_prize: winningTeam === "blue" ? winPrize : losePrize,
      })
      .eq("id", round.id);

    const { data: players } = await supabase
      .from("team_game_players")
      .select("*")
      .eq("round_id", round.id);

    for (const p of (players || [])) {
      if (p.ads_watched === 0) continue;
      const prize = p.team === winningTeam ? winPrize : losePrize;
      await supabase.from("team_game_players").update({ prize }).eq("id", p.id);
      await supabase.rpc("add_balance", { p_user_id: p.user_id, p_amount: prize });
    }

    // Create new round
    await supabase.from("team_game_rounds").insert({ status: "active" });

    return new Response(JSON.stringify({
      success: true,
      winningTeam,
      red_ads: round.red_ads,
      blue_ads: round.blue_ads,
      players_rewarded: (players || []).filter(p => p.ads_watched > 0).length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
