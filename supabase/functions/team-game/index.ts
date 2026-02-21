import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getCurrentRoundKey(): string {
  const now = new Date();
  const slot = Math.floor(now.getUTCMinutes() / 20) * 20;
  return `${now.toISOString().split("T")[0]}-${now.getUTCHours()}-${slot}`;
}

function getSecondsUntilNextRound(): number {
  const now = new Date();
  const min = now.getUTCMinutes();
  const sec = now.getUTCSeconds();
  const nextSlot = Math.ceil((min + 1) / 20) * 20;
  return (nextSlot - min) * 60 - sec;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId } = await req.json();
    if (!action) throw new Error("action required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ACTION: join - Join or get current round
    if (action === "join") {
      if (!userId) throw new Error("userId required");

      // Find or create active round
      let { data: round } = await supabase
        .from("team_game_rounds")
        .select("*")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (!round) {
        const { data: newRound, error: createErr } = await supabase
          .from("team_game_rounds")
          .insert({ status: "active" })
          .select()
          .single();
        if (createErr) throw createErr;
        round = newRound;
      }

      // Check if user already in this round
      const { data: existing } = await supabase
        .from("team_game_players")
        .select("*")
        .eq("round_id", round.id)
        .eq("user_id", userId)
        .single();

      if (existing) {
        return new Response(JSON.stringify({
          round,
          player: existing,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Count current teams to balance
      const { count: redCount } = await supabase
        .from("team_game_players")
        .select("*", { count: "exact", head: true })
        .eq("round_id", round.id)
        .eq("team", "red");

      const { count: blueCount } = await supabase
        .from("team_game_players")
        .select("*", { count: "exact", head: true })
        .eq("round_id", round.id)
        .eq("team", "blue");

      // Truly random team assignment
      const team = Math.random() < 0.5 ? "red" : "blue";

      const { data: player, error: insertErr } = await supabase
        .from("team_game_players")
        .insert({
          round_id: round.id,
          user_id: userId,
          team,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ round, player }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: watch-ad - Record an ad watch for the team
    if (action === "watch-ad") {
      if (!userId) throw new Error("userId required");

      // Get active round and player
      const { data: round } = await supabase
        .from("team_game_rounds")
        .select("*")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (!round) throw new Error("No active round");

      const { data: player } = await supabase
        .from("team_game_players")
        .select("*")
        .eq("round_id", round.id)
        .eq("user_id", userId)
        .single();

      if (!player) throw new Error("Not in this round");

      // Increment player's ads_watched
      await supabase
        .from("team_game_players")
        .update({ ads_watched: player.ads_watched + 1 })
        .eq("id", player.id);

      // Increment team's total in round
      const field = player.team === "red" ? "red_ads" : "blue_ads";
      await supabase
        .from("team_game_rounds")
        .update({ [field]: round[field] + 1 })
        .eq("id", round.id);

      // Log the ad watch
      await supabase.from("ad_watch_log").insert({
        user_id: userId,
        type: "team_game",
        slot_key: `team-${round.id}`,
      });

      // Update ads_watched_total on user
      const { data: usr } = await supabase.from("users").select("ads_watched_total").eq("id", userId).single();
      if (usr) {
        await supabase.from("users").update({ ads_watched_total: usr.ads_watched_total + 1 }).eq("id", userId);
      }

      return new Response(JSON.stringify({
        success: true,
        player_ads: player.ads_watched + 1,
        red_ads: round.red_ads + (player.team === "red" ? 1 : 0),
        blue_ads: round.blue_ads + (player.team === "blue" ? 1 : 0),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ACTION: status - Get current round status
    if (action === "status") {
      const { data: round } = await supabase
        .from("team_game_rounds")
        .select("*")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (!round) {
        return new Response(JSON.stringify({ round: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get player counts
      const { count: redPlayers } = await supabase
        .from("team_game_players")
        .select("*", { count: "exact", head: true })
        .eq("round_id", round.id)
        .eq("team", "red");

      const { count: bluePlayers } = await supabase
        .from("team_game_players")
        .select("*", { count: "exact", head: true })
        .eq("round_id", round.id)
        .eq("team", "blue");

      let myPlayer = null;
      if (userId) {
        const { data: p } = await supabase
          .from("team_game_players")
          .select("*")
          .eq("round_id", round.id)
          .eq("user_id", userId)
          .single();
        myPlayer = p;
      }

      return new Response(JSON.stringify({
        round,
        redPlayers: redPlayers || 0,
        bluePlayers: bluePlayers || 0,
        myPlayer,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ACTION: resolve - End current round and pick winner
    if (action === "resolve") {
      const { data: round } = await supabase
        .from("team_game_rounds")
        .select("*")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (!round) {
        return new Response(JSON.stringify({ message: "No active round" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const totalAds = round.red_ads + round.blue_ads;
      let winningTeam: string;

      if (totalAds === 0) {
        // Random if no ads
        winningTeam = Math.random() < 0.5 ? "red" : "blue";
      } else {
        // Weighted random based on ad count
        const redChance = round.red_ads / totalAds;
        winningTeam = Math.random() < redChance ? "red" : "blue";
      }

      const winPrize = 40;
      const losePrize = 10;

      // Update round
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

      // Get all players
      const { data: players } = await supabase
        .from("team_game_players")
        .select("*")
        .eq("round_id", round.id);

      // Award prizes
      for (const p of (players || [])) {
        if (p.ads_watched === 0) continue; // Must have watched at least 1 ad
        const prize = p.team === winningTeam ? winPrize : losePrize;
        await supabase
          .from("team_game_players")
          .update({ prize })
          .eq("id", p.id);
        await supabase.rpc("add_balance", { p_user_id: p.user_id, p_amount: prize });
      }

      // Create new round
      await supabase.from("team_game_rounds").insert({ status: "active" });

      return new Response(JSON.stringify({
        success: true,
        winningTeam,
        red_ads: round.red_ads,
        blue_ads: round.blue_ads,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ACTION: history - Get user's game history
    if (action === "history") {
      if (!userId) throw new Error("userId required");

      const { data } = await supabase
        .from("team_game_players")
        .select("*, team_game_rounds(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({ history: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
