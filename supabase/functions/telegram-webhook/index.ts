import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

  // Handle GET for webhook setup
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

    // Handle webhook setup action
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
    const photoUrl = ""; // Not available from message, will be updated by telegram-auth

    const MINI_APP_URL = "https://691c729b6ca6a.xvest3.ru";
    const SUPPORT_BOT = "https://t.me/velsupport_bot";

    if (text.startsWith("/start")) {
      const params = text.split(" ");
      let referrerId: string | null = null;

      if (params.length > 1 && params[1].startsWith("ref_")) {
        referrerId = params[1].replace("ref_", "");
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, referred_by")
        .eq("id", userId)
        .single();

      // Helper function to process referral
      const processReferral = async (newUserId: string, refId: string) => {
        const { data: referrer } = await supabase
          .from("users")
          .select("id, referral_count, level")
          .eq("id", refId)
          .single();

        if (!referrer) return;

        // Set referred_by on the new user
        await supabase
          .from("users")
          .update({ referred_by: refId })
          .eq("id", newUserId);

        // Increment referral count
        await supabase.rpc("increment_referral", { referrer_id: refId });

        // Calculate new level
        const newCount = referrer.referral_count + 1;
        const newLvl = getUserLevel(newCount);

        // Update referrer's level
        await supabase
          .from("users")
          .update({ level: newLvl.level })
          .eq("id", refId);

        // Notify referrer
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
        // ===== NEW USER: Create in DB =====
        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        const insertData: Record<string, unknown> = {
          id: userId,
          name: fullName,
          username,
          photo_url: photoUrl,
        };

        // Create the user first
        const { error: insertError } = await supabase
          .from("users")
          .insert(insertData);

        if (insertError) {
          console.error("Failed to create user in webhook:", insertError);
        } else {
          // Process referral after user is created
          if (referrerId && referrerId !== userId) {
            await processReferral(userId, referrerId);
          }
        }
      } else if (existingUser && !existingUser.referred_by && referrerId && referrerId !== userId) {
        // Existing user without referral - process referral now
        console.log(`Processing referral for existing user ${userId} -> ${referrerId}`);
        await processReferral(userId, referrerId);
      }

      // Check & update admin status
      const adminIds = (Deno.env.get("ADMIN_IDS") || "").split(",").map((s: string) => s.trim());
      const isAdmin = adminIds.includes(userId);
      await supabase.from("users").update({ is_admin: isAdmin }).eq("id", userId);

      // Send welcome message with buttons
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
