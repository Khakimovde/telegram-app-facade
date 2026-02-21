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
    const { userId } = await req.json();
    if (!userId) throw new Error("userId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 30-minute slots: 0 or 30
    const now = new Date();
    const slot = now.getUTCMinutes() < 30 ? 0 : 30;
    const hourKey = `${now.toISOString().split("T")[0]}-${now.getUTCHours()}-${slot}`;

    // Get user's tickets
    const { data: userData } = await supabase.from("users").select("tickets").eq("id", userId).single();
    if (!userData || userData.tickets <= 0) throw new Error("No tickets available");

    const tickets = userData.tickets;

    // Insert auction entry
    const { error } = await supabase.from("auction_entries").insert({
      user_id: userId,
      tickets,
      hour_key: hourKey,
    });

    if (error) throw error;

    // Deduct tickets from user
    await supabase.from("users").update({ tickets: 0 }).eq("id", userId);

    // Get participant count for this slot
    const { data: entries } = await supabase
      .from("auction_entries")
      .select("user_id")
      .eq("hour_key", hourKey);

    const uniqueUsers = new Set((entries || []).map((e: { user_id: string }) => e.user_id));
    const totalTickets = await supabase
      .from("auction_entries")
      .select("tickets")
      .eq("hour_key", hourKey);

    const allTickets = (totalTickets.data || []).reduce((s: number, e: { tickets: number }) => s + e.tickets, 0);

    return new Response(
      JSON.stringify({ success: true, hourKey, tickets, participants: uniqueUsers.size, totalTickets: allTickets }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
