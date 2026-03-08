import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYMENT_CHANNEL_ID = "-1003730380202";
const PAYMENT_CHANNEL_USERNAME = "@LunaraPay";

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

async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = Deno.env.get("BOT_TOKEN");
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

async function getNextPaymentNumber(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { count } = await supabase
    .from("withdraw_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "success");
  return (count || 0) + 1;
}

function maskCard(card: string): string {
  const digits = card.replace(/\s/g, "");
  if (digits.length < 8) return card;
  return `${digits.slice(0, 4)} **** ${digits.slice(-4)}`;
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
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

        // Get request details before updating
        const { data: wr } = await supabase
          .from("withdraw_requests")
          .select("user_id, tanga, som, card, created_at")
          .eq("id", requestId)
          .single();

        // If rejected, return both balances
        if (status === "rejected" && wr) {
          const requiredBonus = Math.floor(wr.tanga * 0.13);
          const { data: user } = await supabase
            .from("users")
            .select("balance, bonus_balance")
            .eq("id", wr.user_id)
            .single();

          if (user) {
            await supabase
              .from("users")
              .update({ 
                balance: user.balance + wr.tanga,
                bonus_balance: (user.bonus_balance || 0) + requiredBonus,
              })
              .eq("id", wr.user_id);
          }
        }

        const { data, error } = await supabase
          .from("withdraw_requests")
          .update(updateData)
          .eq("id", requestId)
          .select()
          .single();

        if (error) throw error;

        // Send notification to user
        if (wr) {
          let notifTitle = "";
          let notifMessage = "";
          let notifType = "info";

          if (status === "processing") {
            notifTitle = "⏳ So'rovingiz qabul qilindi";
            notifMessage = `${wr.tanga.toLocaleString()} tanga → ${wr.som.toLocaleString()} so'm o'tkazish jarayonida.`;
          } else if (status === "success") {
            notifTitle = "✅ To'lov amalga oshirildi!";
            notifMessage = `${wr.tanga.toLocaleString()} tanga → ${wr.som.toLocaleString()} so'm ${maskCard(wr.card)} kartangizga o'tkazildi.`;

            // Get user info for payment channel post
            const { data: pUser } = await supabase
              .from("users")
              .select("name, username")
              .eq("id", wr.user_id)
              .single();

            const paymentNum = await getNextPaymentNumber(supabase);
            const now = new Date();
            const nowStr = formatDate(now.toISOString());
            const requestDateStr = formatDate(wr.created_at);

            let channelMsg = `💳 Lunara — navbatdagi to'lov amalga oshirildi #${paymentNum}\n\n`;
            channelMsg += `👍 Foydalanuvchi: ${pUser?.name || "Noma'lum"}\n`;
            if (pUser?.username && pUser.username.trim() !== "" && pUser.username !== "@") {
              channelMsg += `👤 Username: ${pUser.username}\n`;
            }
            channelMsg += `📇 Telegram ID: ${wr.user_id}\n`;
            channelMsg += `💰 Miqdor: ${wr.tanga.toLocaleString()} tanga\n`;
            channelMsg += `🍀 Pul ekvivalenti: ${wr.som.toLocaleString()} so'm\n`;
            channelMsg += `📥 Hamyon: ${maskCard(wr.card)}\n`;
            channelMsg += `⏱ Yechib olish vaqti: ${requestDateStr}\n\n`;
            channelMsg += `✅ Holat: TO'LANDI\n`;
            channelMsg += `⏱ To'lov vaqti: ${nowStr}\n\n`;
            channelMsg += `🛫 Rasmiy kanal: ${PAYMENT_CHANNEL_USERNAME}`;

            await sendTelegramMessage(PAYMENT_CHANNEL_ID, channelMsg);
          } else if (status === "rejected") {
            notifTitle = "❌ So'rovingiz rad etildi";
            notifMessage = `${wr.tanga.toLocaleString()} tanga yechish so'rovi rad etildi.${reason ? ` Sabab: ${reason}` : ""} Balanslaringiz qaytarildi.`;
            notifType = "warning";
          }

          if (notifTitle) {
            await supabase.from("notifications").insert({
              user_id: wr.user_id,
              title: notifTitle,
              message: notifMessage,
              type: notifType,
            });
          }
        }

        result = data;
        break;
      }

      case "broadcast_message": {
        const { title, message } = body;
        if (!title || !message) throw new Error("title and message required");

        // Get ALL user IDs
        const { data: allUsers } = await supabase
          .from("users")
          .select("id");

        if (!allUsers || allUsers.length === 0) {
          result = { sent: 0 };
          break;
        }

        // Insert notifications in batches
        const batchSize = 500;
        let sent = 0;
        for (let i = 0; i < allUsers.length; i += batchSize) {
          const batch = allUsers.slice(i, i + batchSize);
          const notifications = batch.map(u => ({
            user_id: u.id,
            title,
            message,
            type: "info",
          }));
          const { error } = await supabase.from("notifications").insert(notifications);
          if (!error) sent += batch.length;
        }

        result = { sent, total: allUsers.length };
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

      case "update_bonus_balance": {
        const { targetUserId, amount } = body;
        const { data: u } = await supabase
          .from("users")
          .select("bonus_balance")
          .eq("id", targetUserId)
          .single();
        if (!u) throw new Error("User not found");
        const newBalance = (u.bonus_balance || 0) + amount;
        if (newBalance < 0) throw new Error("Bonus tanga yetarli emas!");
        const { data, error } = await supabase
          .from("users")
          .update({ bonus_balance: newBalance })
          .eq("id", targetUserId)
          .select()
          .single();
        if (error) throw error;
        result = data;
        break;
      }

      case "get_bonus_day_workers": {
        const { data: bonusLogs } = await supabase
          .from("ad_watch_log")
          .select("user_id")
          .eq("type", "bonus");

        if (!bonusLogs || bonusLogs.length === 0) {
          result = [];
          break;
        }

        const countMap: Record<string, number> = {};
        for (const log of bonusLogs) {
          countMap[log.user_id] = (countMap[log.user_id] || 0) + 1;
        }

        const userIds = Object.keys(countMap);
        const { data: users } = await supabase
          .from("users")
          .select("id, name, username, bonus_balance")
          .in("id", userIds);

        const workers = (users || []).map(u => ({
          id: u.id,
          name: u.name,
          username: u.username,
          bonus_balance: u.bonus_balance || 0,
          ads_watched: countMap[u.id] || 0,
        })).sort((a, b) => b.ads_watched - a.ads_watched);

        result = workers;
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
