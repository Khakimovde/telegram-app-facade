import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ---- Types ----
export interface DbUser {
  id: string;
  name: string;
  username: string;
  balance: number;
  referral_count: number;
  referral_earnings: number;
  referred_by: string | null;
  level: number;
  ads_watched_total: number;
  auction_wins: number;
  is_admin: boolean;
  created_at: string;
  photo_url?: string;
  tickets: number;
}

export interface DbWithdrawRequest {
  id: string;
  user_id: string;
  tanga: number;
  som: number;
  card: string;
  status: string;
  reason: string | null;
  created_at: string;
}

export interface DbChannelTask {
  id: string;
  name: string;
  username: string;
  reward: number;
  is_active: boolean;
}

export interface DbAuctionResult {
  id: string;
  user_id: string;
  hour_key: string;
  tickets_used: number;
  won: boolean;
  prize: number;
  created_at: string;
}

// ---- LEVELS (same as before) ----
export const LEVELS = [
  { level: 1, emoji: "🌱", name: "Yangi", percent: 5, minReferrals: 0 },
  { level: 2, emoji: "⭐", name: "Faol", percent: 7, minReferrals: 15 },
  { level: 3, emoji: "🔥", name: "Pro", percent: 15, minReferrals: 30 },
  { level: 4, emoji: "💎", name: "Master", percent: 20, minReferrals: 60 },
  { level: 5, emoji: "👑", name: "Elita", percent: 25, minReferrals: 100 },
];

export function getUserLevel(referralCount: number) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) {
    if (referralCount >= l.minReferrals) lvl = l;
  }
  return lvl;
}

export function tangaToSom(tanga: number): number {
  return Math.round(tanga * 1.1764);
}

// ---- Edge Function Caller ----
async function callEdge(fnName: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Edge function error: ${res.status}`);
  }
  return res.json();
}

// ---- API Functions ----

export async function authenticateUser(initData: string, referrerId?: string): Promise<DbUser> {
  const { user } = await callEdge("telegram-auth", { initData, referrerId });
  return user;
}

export async function fetchCurrentUser(userId: string): Promise<DbUser | null> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return data as DbUser | null;
}

export async function fetchTopUsers(count: number = 30): Promise<DbUser[]> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .order("balance", { ascending: false })
    .limit(count);
  return (data || []) as DbUser[];
}

export async function fetchChannelTasks(activeOnly = true): Promise<DbChannelTask[]> {
  let query = supabase.from("channel_tasks").select("*");
  if (activeOnly) query = query.eq("is_active", true);
  const { data } = await query;
  return (data || []) as DbChannelTask[];
}

export async function fetchUserCompletedChannels(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from("user_channel_completions")
    .select("channel_task_id")
    .eq("user_id", userId);
  return (data || []).map((d: { channel_task_id: string }) => d.channel_task_id);
}

export async function completeChannelTask(userId: string, taskId: string): Promise<boolean> {
  const { error } = await supabase
    .from("user_channel_completions")
    .insert({ user_id: userId, channel_task_id: taskId });
  if (error) return false;

  const { data: task } = await supabase
    .from("channel_tasks")
    .select("reward")
    .eq("id", taskId)
    .single();

  if (task) {
    const { data: user } = await supabase
      .from("users")
      .select("balance")
      .eq("id", userId)
      .single();
    if (user) {
      await supabase
        .from("users")
        .update({ balance: (user as { balance: number }).balance + task.reward })
        .eq("id", userId);
    }
  }
  return true;
}

export async function checkChannelMembership(userId: string, channelUsername: string, taskId: string): Promise<{ success: boolean; isMember: boolean; alreadyCompleted?: boolean; reward?: number; message?: string }> {
  return callEdge("check-channel", { userId, channelUsername, taskId });
}

export async function watchAd(userId: string, type: "vazifa" | "reklama") {
  return callEdge("watch-ad", { userId, type });
}

export async function enterAuction(userId: string) {
  return callEdge("enter-auction", { userId });
}

export async function requestWithdraw(userId: string, tanga: number, card: string) {
  return callEdge("withdraw", { userId, tanga, card });
}

export async function fetchUserWithdrawHistory(userId: string): Promise<DbWithdrawRequest[]> {
  const { data } = await supabase
    .from("withdraw_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []) as DbWithdrawRequest[];
}

export async function fetchAllWithdrawRequests(): Promise<DbWithdrawRequest[]> {
  const { data } = await supabase
    .from("withdraw_requests")
    .select("*")
    .order("created_at", { ascending: false });
  return (data || []) as DbWithdrawRequest[];
}

export async function fetchAuctionResults(userId: string): Promise<DbAuctionResult[]> {
  const { data } = await supabase
    .from("auction_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data || []) as DbAuctionResult[];
}

export async function getVazifaAdsCount(userId: string): Promise<{ current: number; slotKey: string }> {
  const now = new Date();
  const h = now.getHours();
  // 2-hour slots: 0,2,4,6,8,10,12,14,16,18,20,22
  const slot = Math.floor(h / 2) * 2;
  const slotKey = `${now.toISOString().split("T")[0]}-${slot}`;

  const { count } = await supabase
    .from("ad_watch_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "vazifa")
    .eq("slot_key", slotKey);

  return { current: count || 0, slotKey };
}

export async function getReklamaAdsCount(userId: string): Promise<{ current: number; slotKey: string }> {
  const now = new Date();
  const slot = Math.floor(now.getMinutes() / 10);
  const slotKey = `${now.getHours()}-${slot}`;

  const { count } = await supabase
    .from("ad_watch_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "reklama")
    .eq("slot_key", slotKey);

  return { current: count || 0, slotKey };
}

export function getCurrentAuctionSlotKey(): string {
  const now = new Date();
  const slot = now.getUTCMinutes() < 30 ? 0 : 30;
  return `${now.toISOString().split("T")[0]}-${now.getUTCHours()}-${slot}`;
}

export async function getUserAuctionTickets(userId: string): Promise<number> {
  const { data } = await supabase
    .from("users")
    .select("tickets")
    .eq("id", userId)
    .single();
  return data?.tickets || 0;
}

export async function getAuctionParticipants(userId?: string): Promise<{ participants: number; totalTickets: number; myEnteredTickets: number }> {
  const hourKey = getCurrentAuctionSlotKey();
  const { data } = await supabase
    .from("auction_entries")
    .select("user_id, tickets")
    .eq("hour_key", hourKey);

  const uniqueUsers = new Set((data || []).map((e: { user_id: string }) => e.user_id));
  const totalTickets = (data || []).reduce((s: number, e: { tickets: number }) => s + e.tickets, 0);
  const myEnteredTickets = userId
    ? (data || []).filter((e: { user_id: string }) => e.user_id === userId).reduce((s: number, e: { tickets: number }) => s + e.tickets, 0)
    : 0;
  return { participants: uniqueUsers.size, totalTickets, myEnteredTickets };
}

export async function getLastAuctionWinner(): Promise<(DbAuctionResult & { user?: DbUser }) | null> {
  const { data } = await supabase
    .from("auction_results")
    .select("*")
    .eq("won", true)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return null;
  const result = data[0] as DbAuctionResult;

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", result.user_id)
    .single();

  return { ...result, user: userData as DbUser | undefined } as DbAuctionResult & { user?: DbUser };
}

// ---- Admin Functions ----
export async function adminAction(adminId: string, action: string, extra: Record<string, unknown> = {}) {
  return callEdge("admin-actions", { adminId, action, ...extra });
}

// ---- Team Game Functions ----
export async function teamGameJoin(userId: string) {
  return callEdge("team-game", { action: "join", userId });
}

export async function teamGameWatchAd(userId: string) {
  return callEdge("team-game", { action: "watch-ad", userId });
}

export async function teamGameStatus(userId: string) {
  return callEdge("team-game", { action: "status", userId });
}

export async function teamGameHistory(userId: string) {
  const data = await callEdge("team-game", { action: "history", userId });
  return data.history || [];
}

// ---- Telegram Helper ----
export function getTelegramUser() {
  const tg = window.Telegram?.WebApp;
  if (!tg?.initData) return null;
  return {
    initData: tg.initData,
    user: tg.initDataUnsafe.user,
    startParam: tg.initDataUnsafe.start_param,
  };
}

export function getTelegramUserId(): string | null {
  const tg = getTelegramUser();
  return tg?.user ? String(tg.user.id) : null;
}
