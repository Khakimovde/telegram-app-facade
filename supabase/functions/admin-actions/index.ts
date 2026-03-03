import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifyAdmin(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const adminIds = (Deno.env.get("ADMIN_IDS") || "").split(",").map(s => s.trim());
  if (!adminIds.includes(userId)) return false;
  
  const { data } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .single();
  
  return data?.is_admin === true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { adminId, action } = body;
    if (!adminId || !action) throw new Error("adminId and action required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const isAdmin = await verifyAdmin(supabase, adminId);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: unknown;

    switch (action) {
      case "update_withdraw_status": {
        const { requestId, status, reason } = body;
        const updateData: Record<string, unknown> = { status };
        if (reason) updateData.reason = reason;

        // If rejected, return balance
        if (status === "rejected") {
          const { data: wr } = await supabase
            .from("withdraw_requests")
            .select("user_id, tanga")
            .eq("id", requestId)
            .single();

          if (wr) {
            const { data: user } = await supabase
              .from("users")
              .select("balance")
              .eq("id", wr.user_id)
              .single();

            if (user) {
              await supabase
                .from("users")
                .update({ balance: user.balance + wr.tanga })
                .eq("id", wr.user_id);
            }
          }
        }

        const { data, error } = await supabase
          .from("withdraw_requests")
          .update(updateData)
          .eq("id", requestId)
          .select()
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      case "update_balance": {
        const { targetUserId, amount } = body;
        const { data: user } = await supabase
          .from("users")
          .select("balance")
          .eq("id", targetUserId)
          .single();

        if (!user) throw new Error("User not found");

        const { data, error } = await supabase
          .from("users")
          .update({ balance: user.balance + amount })
          .eq("id", targetUserId)
          .select()
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      case "add_channel": {
        const { name, username, reward } = body;
        const { data, error } = await supabase
          .from("channel_tasks")
          .insert({ name, username, reward: reward || 50 })
          .select()
          .single();

        if (error) throw error;
        result = data;
        break;
      }

      case "delete_channel": {
        const { channelId } = body;
        // Delete completions first
        await supabase.from("user_channel_completions").delete().eq("channel_task_id", channelId);
        const { error } = await supabase.from("channel_tasks").delete().eq("id", channelId);
        if (error) throw error;
        result = { deleted: channelId };
        break;
      }

      case "get_stats": {
        const { count: totalUsers } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });

        const { count: pendingRequests } = await supabase
          .from("withdraw_requests")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "processing"]);

        const { data: users } = await supabase
          .from("users")
          .select("ads_watched_total, referral_count");

        const totalAds = users?.reduce((s, u) => s + (u.ads_watched_total || 0), 0) || 0;
        const totalRefs = users?.reduce((s, u) => s + (u.referral_count || 0), 0) || 0;

        result = { totalUsers, pendingRequests, totalAds, totalRefs };
        break;
      }

      case "find_user": {
        const { targetUserId } = body;
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", targetUserId)
          .single();

        result = data;
        break;
      }

      case "toggle_bonus_day": {
        const { enabled } = body;
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key: "bonus_day_active", value: enabled ? "true" : "false", updated_at: new Date().toISOString() });
        if (error) throw error;
        result = { bonus_day_active: enabled };
        break;
      }

      case "convert_bonus": {
        const { targetUserId, amount } = body;
        const { data: u } = await supabase
          .from("users")
          .select("bonus_balance, balance")
          .eq("id", targetUserId)
          .single();
        if (!u) throw new Error("User not found");
        if ((u.bonus_balance || 0) < amount) throw new Error("Insufficient bonus balance");

        const { data, error } = await supabase
          .from("users")
          .update({
            bonus_balance: u.bonus_balance - amount,
            balance: u.balance + amount,
          })
          .eq("id", targetUserId)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
