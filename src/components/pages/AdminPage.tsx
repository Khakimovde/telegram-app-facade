import { useState, useEffect } from "react";
import { Settings, BarChart3, Users, FileText, Hash, Search, RefreshCw, CheckCircle2, XCircle, Loader2, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import {
  adminAction,
  fetchAllWithdrawRequests,
  fetchChannelTasks,
  getUserLevel,
  LEVELS,
  type DbUser,
  type DbWithdrawRequest,
  type DbChannelTask,
} from "@/lib/api";

const adminTabs = [
  { id: "statistika", label: "Statistika", icon: BarChart3 },
  { id: "foydalanuvchi", label: "Foydalanuvchi", icon: Users },
  { id: "sorovlar", label: "So'rovlar", icon: FileText },
  { id: "kanal", label: "Kanal", icon: Hash },
];

const statusConfig = {
  pending: { label: "So'rov yuborildi", color: "text-accent-foreground", bg: "bg-accent/20" },
  processing: { label: "O'tkazish jarayonida", color: "text-primary", bg: "bg-primary/10" },
  success: { label: "To'landi", color: "text-success", bg: "bg-success/10" },
  rejected: { label: "Rad etildi", color: "text-destructive", bg: "bg-destructive/10" },
};

const AdminPage = () => {
  const { user, isAdmin } = useUser();
  const [activeTab, setActiveTab] = useState("statistika");
  const [searchId, setSearchId] = useState("");
  const [foundUser, setFoundUser] = useState<DbUser | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelUsername, setChannelUsername] = useState("");
  const [channelReward, setChannelReward] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalUsers: number;
    pendingRequests: number;
    totalAds: number;
    totalRefs: number;
    totalBalance: number;
    totalWithdrawn: number;
    todayUsers: number;
    todayAds: number;
  } | null>(null);
  const [withdrawRequests, setWithdrawRequests] = useState<DbWithdrawRequest[]>([]);
  const [channels, setChannels] = useState<DbChannelTask[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isAdmin) {
      loadStats();
      loadWithdrawRequests();
      loadChannels();

      // Realtime for withdraw requests
      const channel = supabase
        .channel("admin-withdraw-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "withdraw_requests" }, () => {
          loadWithdrawRequests();
          loadStats();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
          loadStats();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user, isAdmin]);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await adminAction(user.id, "get_stats");
      
      // Get additional real stats from DB
      const today = new Date().toISOString().split("T")[0];
      
      const [balanceRes, withdrawnRes, todayUsersRes, todayAdsRes] = await Promise.all([
        supabase.from("users").select("balance"),
        supabase.from("withdraw_requests").select("tanga").eq("status", "success"),
        supabase.from("users").select("id", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00`),
        supabase.from("ad_watch_log").select("id", { count: "exact", head: true }).gte("watched_at", `${today}T00:00:00`),
      ]);

      const totalBalance = (balanceRes.data || []).reduce((s, u) => s + (u.balance || 0), 0);
      const totalWithdrawn = (withdrawnRes.data || []).reduce((s, w) => s + (w.tanga || 0), 0);

      setStats({
        ...res.result,
        totalBalance,
        totalWithdrawn,
        todayUsers: todayUsersRes.count || 0,
        todayAds: todayAdsRes.count || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawRequests = async () => {
    const data = await fetchAllWithdrawRequests();
    setWithdrawRequests(data);
  };

  const loadChannels = async () => {
    const data = await fetchChannelTasks();
    setChannels(data);
  };

  if (!isAdmin) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground text-sm">⛔ Sizga ruxsat berilmagan</p>
      </div>
    );
  }

  const searchUser = async () => {
    if (!searchId.trim() || !user) { toast.error("ID kiriting!"); return; }
    try {
      const res = await adminAction(user.id, "find_user", { targetUserId: searchId.trim() });
      if (res.result) {
        setFoundUser(res.result);
        toast.success(`✅ ${res.result.name} topildi!`);
      } else {
        setFoundUser(null);
        toast.error("Foydalanuvchi topilmadi!");
      }
    } catch {
      toast.error("Xatolik");
    }
  };

  const handleBalance = async (add: boolean) => {
    if (!foundUser || !balanceAmount || !user) return;
    const amount = parseInt(balanceAmount) * (add ? 1 : -1);
    try {
      await adminAction(user.id, "update_balance", { targetUserId: foundUser.id, amount });
      toast.success(`✅ ${foundUser.name} ga ${add ? "+" : ""}${amount} tanga`);
      setBalanceAmount("");
      const res = await adminAction(user.id, "find_user", { targetUserId: foundUser.id });
      setFoundUser(res.result);
    } catch {
      toast.error("Xatolik");
    }
  };

  const updateRequestStatus = async (id: string, status: string, reason?: string) => {
    if (!user) return;
    try {
      await adminAction(user.id, "update_withdraw_status", { requestId: id, status, reason });
      const labels: Record<string, string> = {
        processing: "⏳ O'tkazish jarayonida...",
        success: "✅ To'landi!",
        rejected: "❌ Rad etildi!",
      };
      toast.info(labels[status] || "Yangilandi");
      loadWithdrawRequests();
    } catch {
      toast.error("Xatolik");
    }
  };

  const addChannel = async () => {
    if (!channelName || !channelUsername || !channelReward || !user) {
      toast.error("Barcha maydonlarni to'ldiring!");
      return;
    }
    try {
      await adminAction(user.id, "add_channel", {
        name: channelName,
        username: channelUsername.startsWith("@") ? channelUsername : `@${channelUsername}`,
        reward: parseInt(channelReward) || 50,
      });
      toast.success(`✅ ${channelName} kanali qo'shildi!`);
      setChannelName("");
      setChannelUsername("");
      setChannelReward("");
      loadChannels();
    } catch {
      toast.error("Xatolik");
    }
  };

  const pendingCount = withdrawRequests.filter(r => r.status === "pending" || r.status === "processing").length;

  const statItems = stats ? [
    { label: "Jami foydalanuvchilar", value: (stats.totalUsers || 0).toLocaleString(), icon: Users, color: "text-primary" },
    { label: "Bugungi yangi", value: (stats.todayUsers || 0).toString(), icon: Users, color: "text-success" },
    { label: "Jami reklamalar", value: (stats.totalAds || 0).toLocaleString(), icon: FileText, color: "text-accent" },
    { label: "Bugungi reklamalar", value: (stats.todayAds || 0).toLocaleString(), icon: FileText, color: "text-primary" },
    { label: "Jami referallar", value: (stats.totalRefs || 0).toLocaleString(), icon: Users, color: "text-accent" },
    { label: "Kutilayotgan so'rovlar", value: pendingCount.toString(), icon: RefreshCw, color: "text-destructive" },
    { label: "Jami balans (tanga)", value: (stats.totalBalance || 0).toLocaleString(), icon: BarChart3, color: "text-primary" },
    { label: "Jami yechilgan (tanga)", value: (stats.totalWithdrawn || 0).toLocaleString(), icon: BarChart3, color: "text-success" },
  ] : [];

  return (
    <div className="py-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
          <Settings className="text-destructive" size={16} />
        </div>
        <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5">
        {adminTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${isActive ? "gradient-primary text-primary-foreground" : "bg-card text-muted-foreground card-shadow"}`}>
              <Icon size={12} />
              {tab.label}
              {tab.id === "sorovlar" && pendingCount > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "statistika" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-foreground text-sm">Statistika</h2>
            <button onClick={loadStats} disabled={loading} className="p-1.5 rounded-lg bg-card card-shadow active:scale-95 transition-transform">
              <RefreshCw size={14} className={`text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {statItems.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-card rounded-lg p-3 card-shadow">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={12} className={stat.color} />
                    <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "foydalanuvchi" && (
        <div>
          <h2 className="font-semibold text-foreground text-sm mb-2">Foydalanuvchi boshqaruvi</h2>
          <div className="bg-card rounded-lg p-3 card-shadow mb-3">
            <div className="flex items-center gap-2">
              <input type="text" value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="Telegram ID kiriting" className="flex-1 bg-input rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" onKeyDown={(e) => e.key === "Enter" && searchUser()} />
              <button onClick={searchUser} className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center active:scale-95 transition-transform">
                <Search className="text-primary-foreground" size={16} />
              </button>
            </div>
          </div>

          {foundUser && (() => {
            const foundLvl = getUserLevel(foundUser.referral_count);
            return (
              <div className="bg-card rounded-lg p-3 card-shadow space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0">
                    <div className="w-full h-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">{foundUser.name.charAt(0)}</div>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{foundUser.name}</p>
                    <p className="text-[10px] text-muted-foreground">{foundUser.username} · ID: {foundUser.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Balans</p>
                    <p className="font-bold text-primary text-sm">{foundUser.balance.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Referallar</p>
                    <p className="font-bold text-foreground text-sm">{foundUser.referral_count}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">Reklamalar</p>
                    <p className="font-bold text-foreground text-sm">{foundUser.ads_watched_total}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Daraja</p>
                  <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-2">
                    <span className="text-xl">{foundLvl.emoji}</span>
                    <div>
                      <p className="font-semibold text-foreground text-xs">{foundLvl.name}</p>
                      <p className="text-[10px] text-muted-foreground">Bonus: {foundLvl.percent}%</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {LEVELS.map((lvl) => (
                    <div key={lvl.level} className={`rounded-lg p-1.5 text-center ${lvl.level === foundLvl.level ? "ring-2 ring-primary bg-card" : "bg-muted/30"}`}>
                      <div className="text-sm">{lvl.emoji}</div>
                      <p className="text-[10px] font-bold text-foreground">{lvl.percent}%</p>
                      <p className="text-[8px] text-muted-foreground">{lvl.minReferrals}+</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Tanga qo'shish / ayirish</p>
                  <input type="number" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} placeholder="Miqdor" className="w-full bg-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 mb-2" />
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleBalance(true)} className="flex items-center justify-center gap-1 py-2 rounded-lg bg-success/10 text-success font-semibold text-xs active:scale-95 transition-transform">
                      <Plus size={14} /> Qo'shish
                    </button>
                    <button onClick={() => handleBalance(false)} className="flex items-center justify-center gap-1 py-2 rounded-lg bg-destructive/10 text-destructive font-semibold text-xs active:scale-95 transition-transform">
                      <Minus size={14} /> Ayirish
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {activeTab === "sorovlar" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-foreground text-sm">Pul yechish so'rovlari ({withdrawRequests.length})</h2>
            <button onClick={loadWithdrawRequests} className="p-1.5 rounded-lg bg-card card-shadow active:scale-95 transition-transform">
              <RefreshCw size={14} className="text-muted-foreground" />
            </button>
          </div>
          <div className="space-y-2.5">
            {withdrawRequests.map((req) => {
              const cfg = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.pending;
              const dateStr = new Date(req.created_at).toLocaleString("uz-UZ");
              return (
                <div key={req.id} className="bg-card rounded-lg p-3 card-shadow">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`${cfg.bg} ${cfg.color} text-[10px] font-semibold px-2 py-0.5 rounded-full`}>{cfg.label}</span>
                    <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                  </div>
                  <div className="bg-muted rounded-lg p-2 mb-1.5">
                    <p className="text-xs font-semibold text-foreground">{req.user_name || "Noma'lum"}</p>
                    <p className="text-[10px] text-muted-foreground">{req.user_username || ""} · ID: {req.user_id}</p>
                  </div>
                  <p className="text-xs text-foreground mb-0.5">
                    <strong>{req.tanga.toLocaleString()} tanga</strong> → <span className="text-success font-bold">{req.som.toLocaleString()} so'm</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mb-2">💳 {req.card}</p>

                  {req.status === "pending" && (
                    <div>
                      {rejectingId === req.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rad etish sababini kiriting..."
                            className="w-full bg-input rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-destructive/30 resize-none"
                            rows={2}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                if (!rejectReason.trim()) { toast.error("Sababni kiriting!"); return; }
                                updateRequestStatus(req.id, "rejected", rejectReason.trim());
                                setRejectingId(null);
                                setRejectReason("");
                              }}
                              className="flex items-center justify-center gap-1 py-2 rounded-lg bg-destructive/10 text-destructive font-semibold text-xs active:scale-95 transition-transform"
                            >
                              <XCircle size={14} /> Tasdiqlash
                            </button>
                            <button
                              onClick={() => { setRejectingId(null); setRejectReason(""); }}
                              className="flex items-center justify-center gap-1 py-2 rounded-lg bg-muted text-muted-foreground font-semibold text-xs active:scale-95 transition-transform"
                            >
                              Bekor qilish
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => updateRequestStatus(req.id, "processing")} className="flex items-center justify-center gap-1 py-2 rounded-lg bg-success/10 text-success font-semibold text-xs active:scale-95 transition-transform">
                            <CheckCircle2 size={14} /> Tasdiqlash
                          </button>
                          <button onClick={() => setRejectingId(req.id)} className="flex items-center justify-center gap-1 py-2 rounded-lg bg-destructive/10 text-destructive font-semibold text-xs active:scale-95 transition-transform">
                            <XCircle size={14} /> Rad etish
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {req.status === "processing" && (
                    <div>
                      {rejectingId === req.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Rad etish sababini kiriting..."
                            className="w-full bg-input rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-destructive/30 resize-none"
                            rows={2}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => {
                                if (!rejectReason.trim()) { toast.error("Sababni kiriting!"); return; }
                                updateRequestStatus(req.id, "rejected", rejectReason.trim());
                                setRejectingId(null);
                                setRejectReason("");
                              }}
                              className="flex items-center justify-center gap-1 py-2 rounded-lg bg-destructive/10 text-destructive font-semibold text-xs active:scale-95 transition-transform"
                            >
                              <XCircle size={14} /> Tasdiqlash
                            </button>
                            <button
                              onClick={() => { setRejectingId(null); setRejectReason(""); }}
                              className="flex items-center justify-center gap-1 py-2 rounded-lg bg-muted text-muted-foreground font-semibold text-xs active:scale-95 transition-transform"
                            >
                              Bekor qilish
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => updateRequestStatus(req.id, "success")} className="flex items-center justify-center gap-1 py-2 rounded-lg bg-success/10 text-success font-semibold text-xs active:scale-95 transition-transform">
                            <CheckCircle2 size={14} /> To'landi
                          </button>
                          <button onClick={() => setRejectingId(req.id)} className="flex items-center justify-center gap-1 py-2 rounded-lg bg-destructive/10 text-destructive font-semibold text-xs active:scale-95 transition-transform">
                            <XCircle size={14} /> Rad etish
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {req.reason && (
                    <div className="mt-1.5 bg-destructive/10 rounded px-2 py-1">
                      <p className="text-[10px] font-medium text-destructive">❌ Sabab: {req.reason}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "kanal" && (
        <div>
          <h2 className="font-semibold text-foreground text-sm mb-2">Kanal boshqaruvi</h2>
          <div className="space-y-2 mb-3">
            {channels.map((ch) => (
              <div key={ch.id} className="bg-card rounded-lg p-3 card-shadow flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-sm">📢</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-xs">{ch.name}</p>
                  <p className="text-[10px] text-muted-foreground">{ch.username}</p>
                </div>
                <span className="text-xs font-bold text-accent-foreground mr-1">🪙 {ch.reward}</span>
                <button
                  onClick={async () => {
                    if (!user) return;
                    try {
                      await adminAction(user.id, "delete_channel", { channelId: ch.id });
                      toast.success(`🗑️ ${ch.name} o'chirildi!`);
                      loadChannels();
                    } catch { toast.error("Xatolik"); }
                  }}
                  className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <XCircle size={14} className="text-destructive" />
                </button>
              </div>
            ))}
          </div>
          <div className="bg-card rounded-lg p-3 card-shadow space-y-2">
            <h3 className="font-semibold text-foreground text-xs">➕ Yangi kanal qo'shish</h3>
            <input type="text" value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Kanal nomi" className="w-full bg-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <input type="text" value={channelUsername} onChange={(e) => setChannelUsername(e.target.value)} placeholder="@username" className="w-full bg-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <input type="number" value={channelReward} onChange={(e) => setChannelReward(e.target.value)} placeholder="Mukofot (tanga)" className="w-full bg-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={addChannel} className="w-full gradient-primary text-primary-foreground font-semibold py-2.5 rounded-lg active:scale-[0.98] transition-transform text-sm">
              ➕ Kanal qo'shish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
