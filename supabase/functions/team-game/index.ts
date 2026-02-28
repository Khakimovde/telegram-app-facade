import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Returns the start time of the NEXT 30-min slot (i.e. when current round ends)
function getSlotEnd(): Date {
  const now = new Date();
  const end = new Date(now);
  if (now.getUTCMinutes() < 30) {
    end.setUTCMinutes(30, 0, 0);
  } else {
    end.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
  }
  return end;
}

// Check if a round's slot has ended (started_at is in a previous 30-min slot)
function isRoundExpired(startedAt: string): boolean {
  const now = new Date();
  const slotStart = new Date(now);
  if (now.getUTCMinutes() < 30) {
    slotStart.setUTCMinutes(0, 0, 0);
  } else {
    slotStart.setUTCMinutes(30, 0, 0);
  }
  return new Date(startedAt).getTime() < slotStart.getTime();
}

async function resolveRound(supabase: any, round: any): Promise<string | null> {
  // Atomically mark as completed (only if still active — prevents double resolve)
  const { data: updated, error: updateErr } = await supabase
    .from("team_game_rounds")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
    })
    .eq("id", round.id)
    .eq("status", "active")
    .select()
    .single();

  if (updateErr || !updated) {
    console.log("Round already resolved or update failed:", round.id);
    return null;
  }

  // Determine winner based on ad counts (weighted random)
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

  // Set winning team and prizes on the round
  await supabase
    .from("team_game_rounds")
    .update({
      winning_team: winningTeam,
      red_prize: winningTeam === "red" ? winPrize : losePrize,
      blue_prize: winningTeam === "blue" ? winPrize : losePrize,
    })
    .eq("id", round.id);

  // Award prizes to all players who watched at least 1 ad
  const { data: players } = await supabase
    .from("team_game_players")
    .select("*")
    .eq("round_id", round.id);

  for (const p of (players || [])) {
    if (p.ads_watched < 10) continue;
    const prize = p.team === winningTeam ? winPrize : losePrize;
    await supabase.from("team_game_players").update({ prize }).eq("id", p.id);
    await supabase.rpc("add_balance", { p_user_id: p.user_id, p_amount: prize });
  }

  console.log(`Round ${round.id} resolved: ${winningTeam} won, ${(players || []).filter((p: any) => p.ads_watched > 0).length} players rewarded`);

  // Create new round for the next slot
  await supabase.from("team_game_rounds").insert({ status: "active" });

  return winningTeam;
}

// Get the active round, resolving expired ones first
async function getActiveRound(supabase: any) {
  const { data: round } = await supabase
    .from("team_game_rounds")
    .select("*")
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!round) {
    // No active round — create one
    const { data: newRound } = await supabase
      .from("team_game_rounds")
      .insert({ status: "active" })
      .select()
      .single();
    return { round: newRound, resolvedRoundId: null, winningTeam: null };
  }

  if (isRoundExpired(round.started_at)) {
    const resolvedRoundId = round.id;
    const winningTeam = await resolveRound(supabase, round);

    // Get the newly created active round
    const { data: newRound } = await supabase
      .from("team_game_rounds")
      .select("*")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { round: newRound, resolvedRoundId, winningTeam };
  }

  return { round, resolvedRoundId: null, winningTeam: null };
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

    // ─── ACTION: join ───
    if (action === "join") {
      if (!userId) throw new Error("userId required");

      const { round } = await getActiveRound(supabase);
      if (!round) throw new Error("Could not get active round");

      // Check if already joined this round
      const { data: existing } = await supabase
        .from("team_game_players")
        .select("*")
        .eq("round_id", round.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ round, player: existing }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const team = Math.random() < 0.5 ? "red" : "blue";
      const { data: player, error: insertErr } = await supabase
        .from("team_game_players")
        .insert({ round_id: round.id, user_id: userId, team })
        .select()
        .single();

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ round, player }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ACTION: watch-ad ───
    if (action === "watch-ad") {
      if (!userId) throw new Error("userId required");

      // Get current active round WITHOUT resolving (don't resolve mid-play)
      const { data: round } = await supabase
        .from("team_game_rounds")
        .select("*")
        .eq("status", "active")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!round) throw new Error("No active round");

      // Don't allow ad watching on expired rounds
      if (isRoundExpired(round.started_at)) {
        throw new Error("Round has ended, please wait for results");
      }

      const { data: player } = await supabase
        .from("team_game_players")
        .select("*")
        .eq("round_id", round.id)
        .eq("user_id", userId)
        .maybeSingle();

      if (!player) throw new Error("Not in this round");

      // Increment player's ad count
      await supabase
        .from("team_game_players")
        .update({ ads_watched: player.ads_watched + 1 })
        .eq("id", player.id);

      // Increment team's ad count on the round
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

      // Update user's total ads watched
      const { data: usr } = await supabase
        .from("users")
        .select("ads_watched_total")
        .eq("id", userId)
        .maybeSingle();
      if (usr) {
        await supabase
          .from("users")
          .update({ ads_watched_total: usr.ads_watched_total + 1 })
          .eq("id", userId);
      }

      return new Response(JSON.stringify({
        success: true,
        player_ads: player.ads_watched + 1,
        red_ads: round.red_ads + (player.team === "red" ? 1 : 0),
        blue_ads: round.blue_ads + (player.team === "blue" ? 1 : 0),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: status ───
    if (action === "status") {
      const { round, resolvedRoundId, winningTeam } = await getActiveRound(supabase);

      let userResult = null;

      if (userId) {
        // Check the most recently completed round, but only if it ended recently (within 35 min)
        let checkRoundId = resolvedRoundId;
        let checkWinningTeam = winningTeam;

        if (!checkRoundId) {
          const thirtyFiveMinAgo = new Date(Date.now() - 35 * 60 * 1000).toISOString();
          const { data: lastCompleted } = await supabase
            .from("team_game_rounds")
            .select("id, winning_team, ended_at")
            .eq("status", "completed")
            .gte("ended_at", thirtyFiveMinAgo)
            .order("ended_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastCompleted) {
            checkRoundId = lastCompleted.id;
            checkWinningTeam = lastCompleted.winning_team;
          }
        }

        if (checkRoundId && checkWinningTeam) {
          const { data: playerInResolved } = await supabase
            .from("team_game_players")
            .select("*")
            .eq("round_id", checkRoundId)
            .eq("user_id", userId)
            .maybeSingle();

          // STRICT: only 10+ ads count as participation
          if (playerInResolved && playerInResolved.ads_watched >= 10) {
            const won = playerInResolved.team === checkWinningTeam;
            userResult = {
              won,
              team: playerInResolved.team,
              prize: won ? 30 : 10,
              winningTeam: checkWinningTeam,
              roundId: checkRoundId,
            };
          }
        }
      }

      if (!round) {
        return new Response(JSON.stringify({
          round: null,
          redPlayers: 0,
          bluePlayers: 0,
          myPlayer: null,
          userResult,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

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
          .maybeSingle();
        myPlayer = p;
      }

      return new Response(JSON.stringify({
        round,
        redPlayers: redPlayers || 0,
        bluePlayers: bluePlayers || 0,
        myPlayer,
        userResult,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ACTION: history ───
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
