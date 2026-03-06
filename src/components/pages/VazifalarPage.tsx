import { useState, useEffect, useCallback, useRef } from "react";
import { ListChecks, ChevronRight, CheckCircle2, Clock, Tv, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  watchAd,
  fetchChannelTasks,
  fetchUserCompletedChannels,
  getVazifaAdsCount,
  checkChannelMembership,
  type DbChannelTask,
} from "@/lib/api";

declare global {
  interface Window {
    show_10626599?: () => Promise<void>;
  }
}

const VazifalarPage = () => {
  const { user, refreshUser } = useUser();
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [adsWatched, setAdsWatched] = useState(0);
  const [channelTasks, setChannelTasks] = useState<DbChannelTask[]>([]);
  const [completedChannels, setCompletedChannels] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<DbChannelTask | null>(null);
  const [checking, setChecking] = useState(false);
  const [phase, setPhase] = useState<"idle" | "spinning" | "done">("idle");
  const monetagLoaded = useRef(false);

  // Load Monetag script
  useEffect(() => {
    if (monetagLoaded.current) return;
    monetagLoaded.current = true;
    const script = document.createElement("script");
    script.src = "//munqu.com/sdk.js";
    script.dataset.zone = "10626599";
    script.dataset.sdk = "show_10626599";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [adsData, tasks, completed] = await Promise.all([
      getVazifaAdsCount(user.id),
      fetchChannelTasks(),
      fetchUserCompletedChannels(user.id),
    ]);
    setAdsWatched(adsData.current);
    setChannelTasks(tasks);
    setCompletedChannels(completed);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const getNextReset = () => {
      const now = new Date();
      const h = now.getHours();
      const nextSlot = Math.ceil((h + 1) / 2) * 2;
      const next = new Date(now);
      if (nextSlot >= 24) { next.setDate(next.getDate() + 1); next.setHours(0, 0, 0, 0); }
      else next.setHours(nextSlot, 0, 0, 0);
      return next;
    };
    const interval = setInterval(() => {
      const next = getNextReset();
      const diff = next.getTime() - Date.now();
      if (diff > 0) {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleWatchAd = async () => {
    if (!user || adsWatched >= 10 || phase !== "idle") return;

    // Show Monetag interstitial
    setPhase("spinning");

    try {
      if (typeof window.show_10626599 === "function") {
        await window.show_10626599();
      }
    } catch {
      // Monetag may fail, continue anyway after 7s
    }

    // 7 second minimum wait
    await new Promise(resolve => setTimeout(resolve, 7000));

    try {
      const result = await watchAd(user.id, "vazifa");
      if (!result.success) {
        toast.error("Barcha reklamalar ko'rilgan!");
      } else {
        if (result.current >= result.max) {
          toast.success(`🪙 +120 tanga qo'shildi! (${result.current}/${result.max})`);
        } else {
          toast.info(`📺 Reklama ko'rildi! (${result.current}/${result.max})`);
        }
        await refreshUser();
      }
      setAdsWatched(result.current);
      setPhase("done");
      setTimeout(() => setPhase("idle"), 1200);
    } catch {
      toast.error("Xatolik yuz berdi");
      setPhase("idle");
    }
  };

  const handleOpenChannel = (task: DbChannelTask) => {
    setSelectedTask(task);
  };

  const handleCheckMembership = async () => {
    if (!user || !selectedTask) return;
    setChecking(true);
    try {
      const result = await checkChannelMembership(user.id, selectedTask.username, selectedTask.id);
      if (result.success && result.isMember) {
        if (result.alreadyCompleted) {
          toast.info("Bu vazifa allaqachon bajarilgan!");
        } else {
          toast.success(`✅ ${selectedTask.name} bajarildi! +${result.reward || selectedTask.reward} tanga`);
          setCompletedChannels((prev) => [...prev, selectedTask.id]);
          await refreshUser();
        }
        setSelectedTask(null);
      } else {
        toast.error(result.message || "Siz hali kanalga obuna bo'lmagansiz!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setChecking(false);
    }
  };

  const goToChannel = (username: string) => {
    const clean = username.replace("@", "");
    const url = `https://t.me/${clean}`;
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const adsCompleted = adsWatched >= 10;

  return (
    <div className="py-3">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-1.5 mb-0.5">
          <ListChecks className="text-primary" size={22} />
          <h1 className="text-lg font-bold text-foreground">Vazifalar</h1>
        </div>
        <p className="text-xs text-muted-foreground">Vazifalarni bajaring va tanga yig'ing</p>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => !adsCompleted && phase === "idle" && handleWatchAd()}
          disabled={adsCompleted || phase !== "idle"}
          className="w-full text-left bg-card rounded-2xl p-4 card-3d active:scale-[0.98] transition-transform disabled:opacity-80"
        >
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-2xl shrink-0 btn-3d">
              <Tv size={28} className="text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-base">Reklama ko'rish</h3>
              <p className="text-sm text-muted-foreground">{adsWatched}/10 ta reklama ko'ring</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-sm">🪙</span>
                <span className="text-sm font-bold text-accent-foreground">120 Tanga (10/10 da)</span>
              </div>
            </div>
            {phase === "spinning" ? (
              <Loader2 className="text-primary animate-spin shrink-0" size={20} />
            ) : phase === "done" ? (
              <CheckCircle2 className="text-success shrink-0" size={20} />
            ) : adsCompleted ? (
              <div className="flex items-center gap-1 shrink-0">
                <CheckCircle2 className="text-success" size={18} />
                <span className="text-sm font-medium text-success">Bajarildi</span>
              </div>
            ) : (
              <ChevronRight className="text-muted-foreground shrink-0" size={20} />
            )}
          </div>
          <div className="mt-3 w-full bg-muted rounded-full h-2.5">
            <div className="gradient-coin h-2.5 rounded-full transition-all duration-500" style={{ width: `${(adsWatched / 10) * 100}%` }} />
          </div>
          {adsCompleted && (
            <div className="flex items-center gap-1 mt-2 justify-center">
              <Clock size={12} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Yangilanish: {timeLeft}</span>
            </div>
          )}
        </button>

        {channelTasks.map((task) => {
          const isCompleted = completedChannels.includes(task.id);
          return (
            <button
              key={task.id}
              onClick={() => !isCompleted && handleOpenChannel(task)}
              disabled={isCompleted}
              className="w-full text-left bg-card rounded-2xl p-3 card-3d active:scale-[0.98] transition-transform disabled:opacity-80"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-accent/20 flex items-center justify-center text-lg shrink-0">📢</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{task.name}</h3>
                  <p className="text-xs text-muted-foreground">{task.username}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs">🪙</span>
                    <span className="text-xs font-bold text-accent-foreground">{task.reward} Tanga</span>
                  </div>
                </div>
                {isCompleted ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="text-success" size={15} />
                    <span className="text-xs font-medium text-success">Bajarildi</span>
                  </div>
                ) : (
                  <ChevronRight className="text-muted-foreground shrink-0" size={18} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Channel Task Modal */}
      <Dialog open={!!selectedTask} onOpenChange={(v) => { if (!v) setSelectedTask(null); }}>
        <DialogContent className="max-w-[340px] rounded-3xl p-0 overflow-hidden border-none card-3d">
          <div className="gradient-primary p-4 text-center">
            <DialogHeader>
              <DialogTitle className="text-primary-foreground text-base font-bold">📢 Kanalga obuna bo'lish</DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-4 space-y-4">
            {selectedTask && (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/20 flex items-center justify-center text-3xl mb-2">📢</div>
                  <h3 className="font-bold text-foreground text-sm">{selectedTask.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedTask.username}</p>
                </div>

                <div className="bg-accent/10 rounded-2xl p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Mukofot</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-lg">🪙</span>
                    <span className="text-lg font-bold text-accent-foreground">{selectedTask.reward} Tanga</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => goToChannel(selectedTask.username)}
                    className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-2xl btn-3d text-sm flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={16} />
                    Kanalga o'tish
                  </button>
                  <button
                    onClick={handleCheckMembership}
                    disabled={checking}
                    className="w-full bg-success text-white font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                    style={{ boxShadow: "0 4px 0 hsl(142 70% 35%), 0 6px 12px hsl(142 70% 35% / 0.3)" }}
                  >
                    {checking ? (
                      <><Loader2 size={16} className="animate-spin" /> Tekshirilmoqda...</>
                    ) : (
                      <><CheckCircle2 size={16} /> Tekshirish</>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-muted-foreground text-center">
                  Kanalga obuna bo'ling, keyin "Tekshirish" tugmasini bosing
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VazifalarPage;
