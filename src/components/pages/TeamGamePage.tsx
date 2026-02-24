import { useState, useEffect, useCallback } from "react";
import { Tv, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import AdWatchDialog from "@/components/AdWatchDialog";
import { watchAd, getOyinAdsCount } from "@/lib/api";

const TeamGamePage = () => {
  const { user, refreshUser } = useUser();
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [adsWatched, setAdsWatched] = useState(0);
  const [timeLeft, setTimeLeft] = useState("");
  const maxAds = 10;

  const loadData = useCallback(async () => {
    if (!user) return;
    const data = await getOyinAdsCount(user.id);
    setAdsWatched(data.current);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Timer - counts down to next :00 or :30
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const min = now.getMinutes();
      const sec = now.getSeconds();
      const nextSlot = min < 30 ? 30 : 60;
      const totalRemaining = (nextSlot - min - 1) * 60 + (59 - sec);
      const m = Math.floor(totalRemaining / 60);
      const s = totalRemaining % 60;
      setTimeLeft(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleWatchAd = async () => {
    if (!user) return;
    try {
      const result = await watchAd(user.id, "oyin");
      if (!result.success) {
        toast.error("Barcha reklamalar ko'rilgan! Keyingi vaqtni kuting.");
      } else {
        if (result.current >= result.max) {
          toast.success(`🪙 +${result.earned} tanga qo'shildi! (${result.current}/${result.max})`);
        } else {
          toast.info(`📺 Reklama ko'rildi! (${result.current}/${result.max})`);
        }
        await refreshUser();
      }
      setAdsWatched(result.current);
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  const adsCompleted = adsWatched >= maxAds;

  return (
    <div className="py-3 space-y-3">
      {/* Header */}
      <div className="text-center mb-2">
        <div className="inline-flex items-center gap-1.5 mb-0.5">
          <Tv className="text-accent" size={22} />
          <h1 className="text-lg font-bold text-foreground">O'yin</h1>
        </div>
        <p className="text-xs text-muted-foreground">Har 30 daqiqada 10 ta reklama ko'ring va tanga yuting!</p>
      </div>

      {/* Main card */}
      <div className="bg-card rounded-xl p-4 card-shadow">
        {/* Progress */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-1 mb-2">
            {Array.from({ length: maxAds }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-2 rounded-full transition-all ${
                  i < adsWatched ? "bg-accent" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-sm font-bold text-foreground">{adsWatched}/{maxAds} reklama</p>
        </div>

        {/* Reward info */}
        <div className="bg-accent/10 rounded-xl p-3 text-center mb-4">
          <p className="text-xs text-muted-foreground mb-0.5">Mukofot (10/10 da)</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-xl">🪙</span>
            <span className="text-xl font-bold text-accent-foreground">20 Tanga</span>
          </div>
        </div>

        {adsCompleted ? (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <p className="text-sm font-bold text-success">Bajarildi! 🎉</p>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex items-center justify-center gap-2">
                <Clock size={16} className="text-destructive" />
                <span className="text-xs text-muted-foreground">Keyingi vaqt:</span>
                <span className="text-lg font-mono font-bold text-destructive">{timeLeft}</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdDialogOpen(true)}
            className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl active:scale-[0.97] transition-transform text-sm flex items-center justify-center gap-2"
          >
            <Tv size={18} />
            Reklama ko'rish ({adsWatched}/{maxAds})
          </button>
        )}
      </div>

      {/* Timer always visible when not completed */}
      {!adsCompleted && (
        <div className="bg-card rounded-xl p-3 card-shadow">
          <div className="flex items-center justify-center gap-2">
            <Clock size={14} className="text-destructive" />
            <span className="text-xs text-muted-foreground">Qolgan vaqt:</span>
            <span className="text-base font-mono font-bold text-destructive">{timeLeft}</span>
          </div>
        </div>
      )}

      {/* Rules */}
      <div className="bg-card rounded-xl p-3 card-shadow">
        <h3 className="text-xs font-semibold text-foreground mb-2">📋 Qoidalar</h3>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          <li>• Har 30 daqiqada (00 va 30 daqiqalarda) yangi davr boshlanadi</li>
          <li>• Har davrda 10 ta reklama ko'ring</li>
          <li>• 10/10 bo'lganda 20 tanga beriladi</li>
          <li>• Keyingi davrni kutib, yana davom eting</li>
        </ul>
      </div>

      <AdWatchDialog
        open={adDialogOpen}
        onOpenChange={setAdDialogOpen}
        onWatch={handleWatchAd}
        adsWatched={adsWatched}
        maxAds={maxAds}
        reward="20 Tanga (10/10 da)"
      />
    </div>
  );
};

export default TeamGamePage;
