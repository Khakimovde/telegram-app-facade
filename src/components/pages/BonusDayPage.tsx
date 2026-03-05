import { useState, useEffect, useCallback } from "react";
import { Gift, Tv, Clock } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import AdWatchDialog from "@/components/AdWatchDialog";
import { watchBonusAd, getBonusAdsCount } from "@/lib/api";

const MAX_BONUS_ADS = 5;

const BonusDayPage = () => {
  const { user, refreshUser } = useUser();
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [adsWatchedInSlot, setAdsWatchedInSlot] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });

  const loadData = useCallback(async () => {
    if (!user) return;
    const data = await getBonusAdsCount(user.id);
    setAdsWatchedInSlot(data.current);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const min = now.getMinutes();
      const sec = now.getSeconds();
      const nextSlot = (Math.floor(min / 10) + 1) * 10;
      const diffSec = (nextSlot - min) * 60 - sec;
      setTimeLeft({ minutes: Math.floor(diffSec / 60), seconds: diffSec % 60 });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleWatchAd = useCallback(async () => {
    if (!user || adsWatchedInSlot >= MAX_BONUS_ADS) return;
    try {
      const result = await watchBonusAd(user.id);
      if (result.success) {
        setAdsWatchedInSlot((p) => p + 1);
        toast.success("🎁 +2 Bonus tanga qo'shildi!");
        await refreshUser();
      } else {
        toast.error(result.error || "Limit tugadi! Keyingi davrani kuting.");
      }
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  }, [user, refreshUser, adsWatchedInSlot]);

  const limitReached = adsWatchedInSlot >= MAX_BONUS_ADS;
  const fmt = (m: number, s: number) => `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <div className="py-3 space-y-3">
      <div className="text-center mb-2">
        <div className="inline-flex items-center gap-1.5 mb-0.5">
          <Gift className="text-accent-foreground" size={24} />
          <h1 className="text-lg font-bold text-foreground">Bonus tanga</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Reklama ko'ring va bonus tanga yig'ing!
        </p>
      </div>

      {/* Bonus balance card */}
      <div className="bg-card rounded-2xl p-5 card-3d text-center">
        <p className="text-xs text-muted-foreground mb-1">Bonus balansingiz</p>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-2xl">🎁</span>
          <span className="text-3xl font-bold text-accent-foreground">
            {(user?.bonus_balance || 0).toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">bonus tanga</span>
        </div>

        <div className="bg-accent/10 rounded-2xl p-3 mb-4 card-3d">
          <p className="text-xs text-muted-foreground mb-0.5">Har bir reklama uchun</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-lg">🎁</span>
            <span className="text-lg font-bold text-accent-foreground">+2 Bonus Tanga</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Har 10 daqiqada {MAX_BONUS_ADS} ta reklama ko'rish mumkin
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2.5 mb-3">
          <div
            className="gradient-primary h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${(adsWatchedInSlot / MAX_BONUS_ADS) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {adsWatchedInSlot}/{MAX_BONUS_ADS} reklama ko'rildi
        </p>

        {limitReached ? (
          <div className="text-center py-3">
            <Clock className="mx-auto text-muted-foreground mb-1" size={20} />
            <p className="text-xs text-muted-foreground">
              Keyingi reklamalar: <span className="font-bold text-primary">{fmt(timeLeft.minutes, timeLeft.seconds)}</span>
            </p>
          </div>
        ) : (
          <button
            onClick={() => setAdDialogOpen(true)}
            className="w-full gradient-primary text-primary-foreground font-bold py-3.5 rounded-2xl btn-3d text-sm flex items-center justify-center gap-2"
          >
            <Tv size={18} />
            Reklama ko'rish
          </button>
        )}
      </div>

      {/* Motivation */}
      <div className="bg-card rounded-2xl p-3 card-3d">
        <h3 className="text-xs font-semibold text-foreground mb-2">💪 Ko'proq ishlang!</h3>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          <li>• Har bir reklama uchun 2 bonus tanga beriladi</li>
          <li>• Har 10 daqiqada {MAX_BONUS_ADS} ta reklama ko'rish mumkin</li>
          <li>• Qancha ko'p ko'rsangiz, shuncha ko'p yig'asiz</li>
          <li>• Bonus tangalaringizdan unumli foydalaning! 🚀</li>
          <li>• Ko'proq ishlang va maqsadingizga yeting! 💰</li>
        </ul>
      </div>

      <AdWatchDialog
        open={adDialogOpen}
        onOpenChange={setAdDialogOpen}
        onWatch={handleWatchAd}
        adsWatched={adsWatchedInSlot}
        maxAds={MAX_BONUS_ADS}
        reward="+2 Bonus Tanga"
        useAlternatingLinks
      />
    </div>
  );
};

export default BonusDayPage;
