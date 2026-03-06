import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Loader2, ExternalLink } from "lucide-react";

const AD_URL_1 = "https://crn77.com/4/10640772";
const AD_URL_2 = "https://omg10.com/4/10684278";

interface AdWatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWatch: () => Promise<void>;
  adsWatched: number;
  maxAds: number;
  reward: string;
  unlimited?: boolean;
  useAlternatingLinks?: boolean;
  useRichAdsInterstitial?: boolean;
}

// Track which link was last used globally for alternating
let lastLinkIndex = 0;

const AdWatchDialog = ({ open, onOpenChange, onWatch, adsWatched, maxAds, reward, unlimited = false, useAlternatingLinks = false, useRichAdsInterstitial = false }: AdWatchDialogProps) => {
  const [phase, setPhase] = useState<"idle" | "spinning" | "done">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getAdUrl = () => {
    if (!useAlternatingLinks) return AD_URL_1;
    const url = lastLinkIndex === 0 ? AD_URL_1 : AD_URL_2;
    lastLinkIndex = lastLinkIndex === 0 ? 1 : 0;
    return url;
  };

  const openAdLink = () => {
    const url = getAdUrl();
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

  const handleWatch = useCallback(async () => {
    if (!unlimited && adsWatched >= maxAds) return;
    if (phase !== "idle") return;

    setPhase("spinning");

    // Try RichAds interstitial first if enabled
    if (useRichAdsInterstitial) {
      let richAdsShown = false;
      try {
        if (window.TelegramAdsController?.triggerInterstitialBanner) {
          await window.TelegramAdsController.triggerInterstitialBanner();
          richAdsShown = true;
        }
      } catch {
        // RichAds failed
      }
      // Fallback to direct links if RichAds didn't work
      if (!richAdsShown) {
        openAdLink();
      }
    } else {
      // Standard direct link
      openAdLink();
    }

    // 7 second minimum wait
    timerRef.current = setTimeout(async () => {
      try {
        await onWatch();
        setPhase("done");
        setTimeout(() => setPhase("idle"), 1200);
      } catch {
        setPhase("idle");
      }
    }, 7000);
  }, [adsWatched, maxAds, phase, unlimited, onWatch, useRichAdsInterstitial]);

  const completed = !unlimited && adsWatched >= maxAds;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (phase === "idle" || phase === "done") onOpenChange(v); }}>
      <DialogContent className="max-w-[340px] rounded-3xl p-0 overflow-hidden border-none card-3d">
        <div className="gradient-primary p-4 text-center">
          <DialogHeader>
            <DialogTitle className="text-primary-foreground text-base font-bold">📺 Reklama ko'rish</DialogTitle>
          </DialogHeader>
          <p className="text-primary-foreground/80 text-xs mt-1">Reklama ko'ring va mukofot oling!</p>
        </div>

        <div className="p-4 space-y-4">
          {!unlimited && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                {Array.from({ length: maxAds }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-2 rounded-full transition-all ${
                      i < adsWatched ? "gradient-primary" : "bg-muted"
                    }`}
                    style={i < adsWatched ? { boxShadow: "0 2px 4px hsl(0 78% 50% / 0.3)" } : {}}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {adsWatched}/{maxAds} reklama ko'rildi
              </p>
            </div>
          )}

          <div className="bg-accent/10 rounded-2xl p-3 text-center card-3d">
            <p className="text-xs text-muted-foreground mb-0.5">Mukofot</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg">🪙</span>
              <span className="text-lg font-bold text-accent-foreground">{reward}</span>
            </div>
          </div>

          {phase === "spinning" ? (
            <div className="space-y-3">
              <button
                disabled
                className="w-full gradient-primary text-primary-foreground font-bold py-3.5 rounded-2xl btn-3d text-sm flex items-center justify-center gap-2 opacity-90"
              >
                <Loader2 size={18} className="animate-spin" />
                Hisoblanmoqda...
              </button>
              <p className="text-xs text-center text-muted-foreground">⏳ Kamida 7 soniya ko'ring</p>
            </div>
          ) : phase === "done" ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-success/10 flex items-center justify-center" style={{ boxShadow: "0 4px 12px hsl(142 70% 45% / 0.2)" }}>
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <p className="text-sm font-semibold text-success">Muvaffaqiyatli!</p>
            </div>
          ) : completed ? (
            <div className="text-center py-3">
              <CheckCircle2 className="w-10 h-10 mx-auto text-success mb-2" />
              <p className="text-sm font-semibold text-success">Barcha reklamalar ko'rildi!</p>
              <p className="text-xs text-muted-foreground mt-1">Keyingi yangilanishni kuting</p>
            </div>
          ) : (
            <button
              onClick={handleWatch}
              className="w-full gradient-primary text-primary-foreground font-bold py-3.5 rounded-2xl btn-3d text-sm flex items-center justify-center gap-2"
            >
              <ExternalLink size={18} />
              Reklama ko'rish
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdWatchDialog;
