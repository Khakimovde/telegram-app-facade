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
    const { userId, channelUsername, taskId } = await req.json();
    if (!userId || !channelUsername || !taskId) {
      throw new Error("userId, channelUsername, and taskId required");
    }

    const botToken = Deno.env.get("BOT_TOKEN");
    if (!botToken) throw new Error("BOT_TOKEN not configured");

    // Clean channel username - remove @ if present
    const chatId = channelUsername.startsWith("@") ? channelUsername : `@${channelUsername}`;

    // Check if user is member of the channel via Telegram Bot API
    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${userId}`
    );
    const tgData = await tgRes.json();

    if (!tgData.ok) {
      // Bot might not be admin in channel
      return new Response(
        JSON.stringify({ 
          success: false, 
          isMember: false, 
          error: "Bot kanalda admin emas yoki kanal topilmadi" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const status = tgData.result?.status;
    const isMember = ["member", "administrator", "creator"].includes(status);

    if (!isMember) {
      return new Response(
        JSON.stringify({ success: false, isMember: false, message: "Siz hali kanalga obuna bo'lmagansiz!" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User is a member - record completion and award reward
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if already completed
    const { data: existing } = await supabase
      .from("user_channel_completions")
      .select("id")
      .eq("user_id", userId)
      .eq("channel_task_id", taskId)
      .single();

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, isMember: true, alreadyCompleted: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert completion
    const { error: insertError } = await supabase
      .from("user_channel_completions")
      .insert({ user_id: userId, channel_task_id: taskId });

    if (insertError) throw insertError;

    // Get task reward
    const { data: task } = await supabase
      .from("channel_tasks")
      .select("reward")
      .eq("id", taskId)
      .single();

    if (task) {
      await supabase.rpc("add_balance", { p_user_id: userId, p_amount: task.reward });
    }

    return new Response(
      JSON.stringify({ success: true, isMember: true, reward: task?.reward || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
