import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, CheckCircle2, Loader2, Tv } from "lucide-react";

interface AdWatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWatch: () => Promise<void>;
  adsWatched: number;
  maxAds: number;
  reward: string;
  timerDuration?: number;
  unlimited?: boolean;
}

const AdWatchDialog = ({ open, onOpenChange, onWatch, adsWatched, maxAds, reward, timerDuration = 10, unlimited = false }: AdWatchDialogProps) => {
  const [phase, setPhase] = useState<"idle" | "watching" | "done">("idle");
  const [countdown, setCountdown] = useState(timerDuration);

  useEffect(() => {
    if (!document.querySelector('script[data-zone="10626599"]')) {
      const script = document.createElement("script");
      script.src = "//munqu.com/sdk.js";
      script.setAttribute("data-zone", "10626599");
      script.setAttribute("data-sdk", "show_10626599");
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleWatch = useCallback(async () => {
    if (!unlimited && adsWatched >= maxAds) return;
    if (phase !== "idle") return;
    setPhase("watching");
    setCountdown(timerDuration);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (typeof w.show_10626599 === "function") {
        w.show_10626599();
      }
    } catch (e) {
      console.log("Munqu ad SDK not available:", e);
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    await new Promise((r) => setTimeout(r, timerDuration * 1000));
    clearInterval(timer);

    try {
      await onWatch();
      setPhase("done");
      setTimeout(() => {
        setPhase("idle");
        setCountdown(timerDuration);
      }, 1500);
    } catch {
      setPhase("idle");
      setCountdown(timerDuration);
    }
  }, [adsWatched, maxAds, phase, onWatch, timerDuration, unlimited]);

  const completed = !unlimited && adsWatched >= maxAds;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (phase === "idle" || phase === "done") onOpenChange(v); }}>
      <DialogContent className="max-w-[340px] rounded-2xl p-0 overflow-hidden border-none">
        <div className="gradient-primary p-4 text-center">
          <DialogHeader>
            <DialogTitle className="text-primary-foreground text-base font-bold">📺 Reklama ko'rish</DialogTitle>
          </DialogHeader>
          <p className="text-primary-foreground/80 text-xs mt-1">Reklama ko'ring va mukofot oling!</p>
        </div>

        <div className="p-4 space-y-4">
          {/* Progress - only for limited mode */}
          {!unlimited && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-2">
                {Array.from({ length: maxAds }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-1.5 rounded-full transition-all ${
                      i < adsWatched ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {adsWatched}/{maxAds} reklama ko'rildi
              </p>
            </div>
          )}

          {/* Reward info */}
          <div className="bg-accent/10 rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Mukofot</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-lg">🪙</span>
              <span className="text-lg font-bold text-accent-foreground">{reward}</span>
            </div>
          </div>

          {/* Action area */}
          {phase === "watching" ? (
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center relative">
                <Loader2 className="w-10 h-10 text-primary animate-spin absolute" />
                <span className="text-lg font-bold text-primary z-10">{countdown}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">Reklama ko'rilmoqda...</p>
              <p className="text-xs text-muted-foreground mt-1">Iltimos, kutib turing</p>
              <div id="munqu-ad-container" className="mt-3 min-h-[50px]" />
            </div>
          ) : phase === "done" ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-success/10 flex items-center justify-center">
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
              className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl active:scale-[0.97] transition-transform text-sm flex items-center justify-center gap-2"
            >
              <Play size={18} />
              Reklama ko'rish
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdWatchDialog;
