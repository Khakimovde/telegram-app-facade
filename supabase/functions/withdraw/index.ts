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
    const { userId, tanga, card } = await req.json();
    if (!userId || !tanga || !card) throw new Error("userId, tanga, and card required");
    if (tanga < 10000) throw new Error("Minimal 10000 tanga");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check both balances
    const { data: user } = await supabase
      .from("users")
      .select("balance, bonus_balance")
      .eq("id", userId)
      .single();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Foydalanuvchi topilmadi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Required bonus_balance = tanga * 0.3
    const requiredBonus = Math.floor(tanga * 0.3);

    if (user.balance < tanga) {
      return new Response(
        JSON.stringify({ error: `Asosiy balans yetarli emas! ${tanga.toLocaleString()} tanga kerak.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((user.bonus_balance || 0) < requiredBonus) {
      return new Response(
        JSON.stringify({ 
          error: `Bonus tanga yetarli emas! ${tanga.toLocaleString()} tanga yechish uchun ${requiredBonus.toLocaleString()} bonus tanga kerak. Sizda: ${(user.bonus_balance || 0).toLocaleString()} bonus tanga.` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct both balances
    await supabase
      .from("users")
      .update({ 
        balance: user.balance - tanga,
        bonus_balance: (user.bonus_balance || 0) - requiredBonus,
      })
      .eq("id", userId);

    // Calculate som (1 tanga = 1.1764 so'm)
    const som = Math.round(tanga * 1.1764);

    // Create withdraw request
    const { data: request, error } = await supabase
      .from("withdraw_requests")
      .insert({
        user_id: userId,
        tanga,
        som,
        card,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, request }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
