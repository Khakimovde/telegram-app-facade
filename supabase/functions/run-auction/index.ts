import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    // Determine the previous 30-minute slot key
    const now = new Date();
    const prevSlot = new Date(now.getTime() - 1800000); // 30 min ago
    const slot = prevSlot.getUTCMinutes() < 30 ? 0 : 30;
    const hourKey = `${prevSlot.toISOString().split("T")[0]}-${prevSlot.getUTCHours()}-${slot}`;

    // Get all entries for the previous slot
    const { data: entries } = await supabase
      .from("auction_entries")
      .select("*")
      .eq("hour_key", hourKey);

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ message: "No auction entries for this slot", hourKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by user
    const userTickets: Record<string, number> = {};
    for (const entry of entries) {
      userTickets[entry.user_id] = (userTickets[entry.user_id] || 0) + entry.tickets;
    }

    // Calculate total tickets
    const totalTickets = Object.values(userTickets).reduce((a, b) => a + b, 0);

    // Pick ONE winner based on weighted random (more tickets = higher chance)
    let winnerId: string | null = null;
    const rand = Math.random() * totalTickets;
    let cumulative = 0;
    for (const [userId, tickets] of Object.entries(userTickets)) {
      cumulative += tickets;
      if (rand <= cumulative) {
        winnerId = userId;
        break;
      }
    }

    const prize = 100 + Math.floor(Math.random() * 121); // 100-220
    const loserPrize = 20;

    const results = [];
    for (const [userId, tickets] of Object.entries(userTickets)) {
      const won = userId === winnerId;
      const userPrize = won ? prize : loserPrize;

      // Update user balance
      const { data: user } = await supabase
        .from("users")
        .select("balance, auction_wins")
        .eq("id", userId)
        .single();

      if (user) {
        const updates: Record<string, number> = {
          balance: user.balance + userPrize,
        };
        if (won) {
          updates.auction_wins = user.auction_wins + 1;
        }
        await supabase.from("users").update(updates).eq("id", userId);
      }

      // Record result
      await supabase.from("auction_results").insert({
        user_id: userId,
        hour_key: hourKey,
        tickets_used: tickets,
        won,
        prize: userPrize,
      });

      results.push({ userId, tickets, won, prize: userPrize });
    }

    return new Response(
      JSON.stringify({ hourKey, totalTickets, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
