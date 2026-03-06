import { useState, useEffect, useCallback, useRef } from "react";
import { Gift, Tv, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { watchBonusAd, getBonusAdsCount } from "@/lib/api";

const MAX_BONUS_ADS = 5;

const AD_URL_1 = "https://crn77.com/4/10640772";
const AD_URL_2 = "https://omg10.com/4/10684278";
let lastLinkIndex = 0;

declare global {
  interface Window {
    TelegramAdsController?: {
      triggerInterstitialBanner: (immediate?: boolean) => Promise<string>;
      initialize: (opts: { pubId: string; appId: string; debug?: boolean }) => void;
    };
  }
}

const BonusDayPage = () => {
  const { user, refreshUser } = useUser();
  const [adsWatchedInSlot, setAdsWatchedInSlot] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });
  const [phase, setPhase] = useState<"idle" | "spinning" | "done">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const openFallbackLink = () => {
    const url = lastLinkIndex === 0 ? AD_URL_1 : AD_URL_2;
    lastLinkIndex = lastLinkIndex === 0 ? 1 : 0;
    try {
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(url);
      } else {
        window.open(url, "_blank");
      }
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleWatchAd = useCallback(async () => {
    if (!user || adsWatchedInSlot >= MAX_BONUS_ADS || phase !== "idle") return;

    setPhase("spinning");

    // Try RichAds interstitial video first
    let richAdsShown = false;
    try {
      if (window.TelegramAdsController?.triggerInterstitialBanner) {
        await window.TelegramAdsController.triggerInterstitialBanner();
        richAdsShown = true;
      }
    } catch {
      // RichAds failed, will use fallback
    }

    // If RichAds didn't show, open fallback direct link
    if (!richAdsShown) {
      openFallbackLink();
    }

    // 7 second minimum wait
    timerRef.current = setTimeout(async () => {
      try {
        const result = await watchBonusAd(user.id);
        if (result.success) {
          setAdsWatchedInSlot((p) => p + 1);
          toast.success("🎁 +2 Bonus tanga qo'shildi!");
          await refreshUser();
        } else {
          toast.error(result.error || "Limit tugadi! Keyingi davrani kuting.");
        }
        setPhase("done");
        setTimeout(() => setPhase("idle"), 1200);
      } catch {
        toast.error("Xatolik yuz berdi");
        setPhase("idle");
      }
    }, 7000);
  }, [user, refreshUser, adsWatchedInSlot, phase]);

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
        ) : phase === "spinning" ? (
          <button
            disabled
            className="w-full gradient-primary text-primary-foreground font-bold py-3.5 rounded-2xl btn-3d text-sm flex items-center justify-center gap-2 opacity-90"
          >
            <Loader2 size={18} className="animate-spin" />
            Hisoblanmoqda...
          </button>
        ) : phase === "done" ? (
          <div className="flex items-center justify-center gap-2 py-3">
            <CheckCircle2 className="text-success" size={20} />
            <span className="text-sm font-semibold text-success">Muvaffaqiyatli!</span>
          </div>
        ) : (
          <button
            onClick={handleWatchAd}
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
    </div>
  );
};

export default BonusDayPage;
