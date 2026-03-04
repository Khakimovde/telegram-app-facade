import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LEVELS = [
  { level: 1, emoji: "🌱", name: "Yangi", percent: 5, minReferrals: 0 },
  { level: 2, emoji: "⭐", name: "Faol", percent: 7, minReferrals: 15 },
  { level: 3, emoji: "🔥", name: "Pro", percent: 15, minReferrals: 30 },
  { level: 4, emoji: "💎", name: "Master", percent: 20, minReferrals: 60 },
  { level: 5, emoji: "👑", name: "Elita", percent: 25, minReferrals: 100 },
];

function getUserLevel(referralCount: number) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) {
    if (referralCount >= l.minReferrals) lvl = l;
  }
  return lvl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    const botToken = Deno.env.get("BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "BOT_TOKEN not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "set") {
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "webhook endpoint ready" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const botToken = Deno.env.get("BOT_TOKEN");
    if (!botToken) throw new Error("BOT_TOKEN not set");

    const body = await req.json();

    if (body.action === "set_webhook") {
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update = body;
    const message = update.message;

    if (!message?.text) {
      return new Response("OK", { headers: corsHeaders });
    }

    const chatId = message.chat.id;
    const text = message.text;
    const userId = String(message.from.id);
    const firstName = message.from.first_name || "";
    const lastName = message.from.last_name || "";
    const username = message.from.username ? `@${message.from.username}` : "";
    const photoUrl = "";

    const MINI_APP_URL = "https://c1621.coresuz.ru";
    const SUPPORT_BOT = "https://t.me/velsupport_bot";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if sender is admin
    const adminIds = (Deno.env.get("ADMIN_IDS") || "").split(",").map((s: string) => s.trim());
    const isAdminUser = adminIds.includes(userId);

    // Handle /bonusday command (admin only)
    if (text === "/bonusday" && isAdminUser) {
      const { data: bonusLogs } = await supabase
        .from("ad_watch_log")
        .select("user_id")
        .eq("type", "bonus");

      if (!bonusLogs || bonusLogs.length === 0) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "📊 *Bonus Day*\n\nHali hech kim bonus reklama ko'rmagan.",
            parse_mode: "Markdown",
          }),
        });
        return new Response("OK", { headers: corsHeaders });
      }

      // Count per user
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

      let msgText = `📊 *Bonus Day ishlovchilar*\n\nJami: *${workers.length}* ta foydalanuvchi\n\n`;
      
      for (const w of workers.slice(0, 50)) {
        msgText += `👤 *${w.name}*\n`;
        msgText += `   ${w.username} · ID: \`${w.id}\`\n`;
        msgText += `   📺 Ko'rilgan: *${w.ads_watched}* | 🎁 Balans: *${w.bonus_balance}*\n\n`;
      }

      if (workers.length > 50) {
        msgText += `\n... va yana ${workers.length - 50} ta`;
      }

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: msgText,
          parse_mode: "Markdown",
        }),
      });

      return new Response("OK", { headers: corsHeaders });
    }

    if (text.startsWith("/start")) {
      const params = text.split(" ");
      let referrerId: string | null = null;

      if (params.length > 1 && params[1].startsWith("ref_")) {
        referrerId = params[1].replace("ref_", "");
      }

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, referred_by")
        .eq("id", userId)
        .single();

      const processReferral = async (newUserId: string, refId: string) => {
        const { data: referrer } = await supabase
          .from("users")
          .select("id, referral_count, level")
          .eq("id", refId)
          .single();

        if (!referrer) return;

        await supabase
          .from("users")
          .update({ referred_by: refId })
          .eq("id", newUserId);

        await supabase.rpc("increment_referral", { referrer_id: refId });

        const newCount = referrer.referral_count + 1;
        const newLvl = getUserLevel(newCount);

        await supabase
          .from("users")
          .update({ level: newLvl.level })
          .eq("id", refId);

        const notifText = `🎉 *Yangi referal!*\n\n` +
          `👤 *${firstName}* sizning referalingiz bo'ldi!\n\n` +
          `📊 Jami referallaringiz: *${newCount}*\n` +
          `${newLvl.emoji} Darajangiz: *${newLvl.name}*\n` +
          `💰 Oladigan foizingiz: *${newLvl.percent}%*\n\n` +
          `Do'stlaringiz ishlagan tangalardan *${newLvl.percent}%* sizga beriladi!`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: refId,
            text: notifText,
            parse_mode: "Markdown",
          }),
        });

        console.log(`Referral processed: ${newUserId} -> ${refId}, new count: ${newCount}`);
      };

      if (!existingUser) {
        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        const insertData: Record<string, unknown> = {
          id: userId,
          name: fullName,
          username,
          photo_url: photoUrl,
        };

        const { error: insertError } = await supabase
          .from("users")
          .insert(insertData);

        if (insertError) {
          console.error("Failed to create user in webhook:", insertError);
        } else {
          if (referrerId && referrerId !== userId) {
            await processReferral(userId, referrerId);
          }
        }
      } else if (existingUser && !existingUser.referred_by && referrerId && referrerId !== userId) {
        console.log(`Processing referral for existing user ${userId} -> ${referrerId}`);
        await processReferral(userId, referrerId);
      }

      // Check & update admin status
      await supabase.from("users").update({ is_admin: isAdminUser }).eq("id", userId);

      const welcomeText = `👋 Salom, *${firstName}*!\n\n` +
        `🪙 *LunaraPay* — reklama ko'rib pul ishlang!\n\n` +
        `✅ Reklamalarni ko'ring\n` +
        `✅ Vazifalarni bajaring\n` +
        `✅ Do'stlarni taklif qiling\n` +
        `✅ Jamoaviy o'yinda yuting\n\n` +
        `💰 Tanga yig'ib, haqiqiy pulga aylantirib oling!`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeText,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🚀 Boshlash",
                  web_app: { url: MINI_APP_URL },
                },
              ],
              [
                {
                  text: "📞 Aloqa",
                  url: SUPPORT_BOT,
                },
              ],
            ],
          },
        }),
      });
    }

    return new Response("OK", { headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("OK", { headers: corsHeaders });
  }
});
