import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function validateTelegramData(initData: string, botToken: string): Promise<Record<string, string> | null> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  params.delete("hash");
  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = await hmacSha256(new TextEncoder().encode("WebAppData"), botToken);
  const calculatedHash = bufferToHex(await hmacSha256(secretKey, dataCheckString));

  if (calculatedHash !== hash) return null;

  const result: Record<string, string> = {};
  for (const [k, v] of params.entries()) {
    result[k] = v;
  }
  result["hash"] = hash;
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData, referrerId } = await req.json();
    const botToken = Deno.env.get("BOT_TOKEN");
    if (!botToken) throw new Error("BOT_TOKEN not configured");

    const validated = await validateTelegramData(initData, botToken);
    if (!validated) {
      return new Response(JSON.stringify({ error: "Invalid Telegram data" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userData = JSON.parse(validated.user || "{}");
    const telegramId = String(userData.id);
    const name = [userData.first_name, userData.last_name].filter(Boolean).join(" ") || "";
    const username = userData.username ? `@${userData.username}` : "";
    const photoUrl = userData.photo_url || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", telegramId)
      .single();

    let user;
    if (existingUser) {
      // User exists (likely created by webhook) - just update profile info
      const { data: updated } = await supabase
        .from("users")
        .update({ name, username, photo_url: photoUrl })
        .eq("id", telegramId)
        .select()
        .single();
      user = updated;
    } else {
      // Fallback: create user if webhook didn't create them
      const insertData: Record<string, unknown> = {
        id: telegramId,
        name,
        username,
        photo_url: photoUrl,
      };

      if (referrerId && referrerId !== telegramId) {
        const { data: referrer } = await supabase
          .from("users")
          .select("id, referral_count")
          .eq("id", referrerId)
          .single();

        if (referrer) {
          insertData.referred_by = referrerId;
          await supabase.rpc("increment_referral", { referrer_id: referrerId });

          const newCount = referrer.referral_count + 1;
          const LEVELS = [
            { level: 1, minReferrals: 0 },
            { level: 2, minReferrals: 15 },
            { level: 3, minReferrals: 30 },
            { level: 4, minReferrals: 60 },
            { level: 5, minReferrals: 100 },
          ];
          let newLevel = 1;
          for (const l of LEVELS) {
            if (newCount >= l.minReferrals) newLevel = l.level;
          }
          await supabase.from("users").update({ level: newLevel }).eq("id", referrerId);
        }
      }

      const { data: newUser, error } = await supabase
        .from("users")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      user = newUser;
    }

    // Check admin status
    const adminIds = (Deno.env.get("ADMIN_IDS") || "").split(",").map((s: string) => s.trim());
    const isAdmin = adminIds.includes(telegramId);
    if (user.is_admin !== isAdmin) {
      await supabase.from("users").update({ is_admin: isAdmin }).eq("id", telegramId);
      user.is_admin = isAdmin;
    }

    return new Response(JSON.stringify({ user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
