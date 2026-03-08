import { useState, useEffect, useCallback, useRef } from "react";
import { Gift, Tv, Clock, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

const MAX_BONUS_ADS = 5;

// 3 fallback links rotating
const FALLBACK_LINKS = [
  "https://www.effectivegatecpm.com/apnsu1mcy?key=b2f0f994a1771e69e07e47c9ab8dc490",
  "https://www.effectivegatecpm.com/exd963f7ka?key=b7fccf168570fddd87a92cd706ba6f64",
  "https://crn77.com/4/10640772",
];
let fallbackIndex = 0;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callWatchAd(userId: string, type: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/watch-ad`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ userId, type }),
  });
  return res.json();
}

async function getSlotCount(userId: string, type: string): Promise<number> {
  const now = new Date();
  const utcH = now.getUTCHours();
  const h = utcH + 5;
  const adjustedH = h >= 24 ? h - 24 : h;
  const slot = Math.floor(now.getUTCMinutes() / 10);
  const slotKey = `${type}-${now.toISOString().split("T")[0]}-${adjustedH}-${slot}`;

  const { count } = await supabase
    .from("ad_watch_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type)
    .eq("slot_key", slotKey);

  return count || 0;
}

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
  const [adsWatched, setAdsWatched] = useState(0);
  const [phase, setPhase] = useState<"idle" | "spinning" | "done">("idle");
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCount = useCallback(async () => {
    if (!user) return;
    const count = await getSlotCount(user.id, "bonus");
    setAdsWatched(count);
  }, [user]);

  useEffect(() => { loadCount(); }, [loadCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const min = now.getMinutes();
      const sec = now.getSeconds();
      const nextSlot = (Math.floor(min / 10) + 1) * 10;
      const diffSec = (nextSlot - min) * 60 - sec;
      setTimeLeft({ minutes: Math.floor(diffSec / 60), seconds: diffSec % 60 });

      if (min % 10 === 0 && sec < 2) {
        loadCount();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [loadCount]);

  const openFallbackLink = useCallback(() => {
    const url = FALLBACK_LINKS[fallbackIndex % FALLBACK_LINKS.length];
    fallbackIndex++;
    try {
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(url);
      } else {
        window.open(url, "_blank");
      }
    } catch {
      window.open(url, "_blank");
    }
  }, []);

  const handleWatch = useCallback(async () => {
    if (!user || adsWatched >= MAX_BONUS_ADS || phase !== "idle") return;

    setPhase("spinning");

    // Try RichAds first
    let richAdsShown = false;
    try {
      if (window.TelegramAdsController?.triggerInterstitialBanner) {
        await window.TelegramAdsController.triggerInterstitialBanner();
        richAdsShown = true;
      }
    } catch {}

    // Fallback to rotating links
    if (!richAdsShown) {
      openFallbackLink();
    }

    timerRef.current = setTimeout(async () => {
      try {
        const result = await callWatchAd(user.id, "bonus");
        if (result.success) {
          setAdsWatched((p) => p + 1);
          toast.success(`🎁 +2 Bonus tanga qo'shildi!`);
          refreshUser();
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
  }, [user, adsWatched, phase, openFallbackLink, refreshUser]);

  const limitReached = adsWatched >= MAX_BONUS_ADS;
  const fmt = (m: number, s: number) => `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  if (!user) return null;

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
      <div className="bg-card rounded-2xl p-4 card-3d text-center">
        <p className="text-xs text-muted-foreground mb-1">Bonus balans</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">⭐</span>
          <span className="text-3xl font-bold text-accent-foreground">
            {(user.bonus_balance || 0).toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">bonus tanga</p>
      </div>

      {/* AI Warning */}
      <div className="bg-accent/10 rounded-xl p-2.5 flex items-center gap-2">
        <AlertTriangle size={16} className="text-accent-foreground shrink-0" />
        <p className="text-[11px] text-accent-foreground">
          ⏱ Kamida 7 soniya ko'ring, aks holda AI avtomatik rad etadi
        </p>
      </div>

      {/* Single ad section */}
      <div className="bg-card rounded-2xl p-4 card-3d">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Tv size={24} className="text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">Reklama ko'rish</p>
            <p className="text-[11px] text-muted-foreground">Har bir reklama = +2 ⭐</p>
            <p className="text-[10px] text-muted-foreground">Har 10 daqiqada {MAX_BONUS_ADS} ta</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-lg">🪙</span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground">Jarayon</span>
          <span className="text-[11px] font-semibold text-foreground">{adsWatched}/{MAX_BONUS_ADS}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mb-3">
          <div
            className="gradient-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${(adsWatched / MAX_BONUS_ADS) * 100}%` }}
          />
        </div>

        {limitReached ? (
          <div className="text-center py-2">
            <Clock className="mx-auto text-muted-foreground mb-1" size={18} />
            <p className="text-[11px] text-muted-foreground">
              Keyingi reklamalar: <span className="font-bold text-primary">{fmt(timeLeft.minutes, timeLeft.seconds)}</span>
            </p>
          </div>
        ) : phase === "spinning" ? (
          <button
            disabled
            className="w-full bg-primary text-white font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 opacity-90"
          >
            <Loader2 size={16} className="animate-spin" />
            Hisoblanmoqda...
          </button>
        ) : phase === "done" ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <CheckCircle2 className="text-success" size={18} />
            <span className="text-sm font-semibold text-success">Muvaffaqiyatli!</span>
          </div>
        ) : (
          <button
            onClick={handleWatch}
            className="w-full bg-primary text-white font-bold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            Reklama ko'rish (+2 bonus) &gt;
          </button>
        )}
      </div>

      {/* Info */}
      <div className="text-center space-y-1 py-2">
        <p className="text-[11px] text-muted-foreground">
          ℹ️ Bonus tangalar pul yechish uchun kerak bo'ladi
        </p>
        <p className="text-[11px] text-muted-foreground">
          💰 Pul yechish 24 soat ichida amalga oshiriladi
        </p>
      </div>
    </div>
  );
};

export default BonusDayPage;
