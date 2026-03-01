import { useState, useEffect, useCallback } from "react";
import { Tv, Ticket, Trophy, Clock, Gift } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import AdWatchDialog from "@/components/AdWatchDialog";
import {
  watchAd,
  enterAuction,
  getReklamaAdsCount,
  getUserAuctionTickets,
  fetchAuctionResults,
  type DbAuctionResult,
} from "@/lib/api";

const ReklamaPage = () => {
  const { user, refreshUser } = useUser();
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });
  const [adsTimeLeft, setAdsTimeLeft] = useState({ minutes: 0, seconds: 0 });
  const [adsWatchedInSlot, setAdsWatchedInSlot] = useState(0);
  const [adTickets, setAdTickets] = useState(0);
  const [auctionTickets, setAuctionTickets] = useState(0);
  const [totalAuctionWon, setTotalAuctionWon] = useState(0);
  const [lastResult, setLastResult] = useState<DbAuctionResult | null>(null);

  const MAX_ADS = 5;

  const loadData = useCallback(async () => {
    if (!user) return;
    const [adsData, aTickets, results] = await Promise.all([
      getReklamaAdsCount(user.id),
      getUserAuctionTickets(user.id),
      fetchAuctionResults(user.id),
    ]);
    setAdsWatchedInSlot(adsData.current);
    setAuctionTickets(aTickets);
    const totalWon = results.filter(r => r.won).reduce((s, r) => s + r.prize, 0);
    setTotalAuctionWon(totalWon);
    if (results.length > 0) setLastResult(results[0]);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTimeLeft({ minutes: 59 - now.getMinutes(), seconds: 59 - now.getSeconds() });
      if (adsWatchedInSlot >= MAX_ADS) {
        const min = now.getMinutes();
        const nextSlot = (Math.floor(min / 10) + 1) * 10;
        const diffSec = (nextSlot - min) * 60 - now.getSeconds();
        setAdsTimeLeft({ minutes: Math.floor(diffSec / 60), seconds: diffSec % 60 });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [adsWatchedInSlot]);

  const handleWatchAd = async () => {
    if (adsWatchedInSlot >= MAX_ADS || !user) return;
    try {
      const result = await watchAd(user.id, "reklama");
      if (result.success) {
        setAdsWatchedInSlot(result.current);
        if (result.current >= MAX_ADS) {
          setAdTickets((prev) => prev + 10);
          toast.success("🎫 +10 chipta olindi!");
        } else {
          toast.info(`📺 Reklama ko'rildi! ${result.current}/${MAX_ADS}`);
        }
      }
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  const handleEnterAuction = async () => {
    if (adTickets <= 0 || !user) {
      toast.error("Chiptangiz yo'q! Reklama ko'ring.");
      return;
    }
    try {
      await enterAuction(user.id);
      toast.success(`🎟️ ${adTickets} ta chipta auksionga qo'yildi!`);
      setAuctionTickets((prev) => prev + adTickets);
      setAdTickets(0);
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  const fmt = (m: number, s: number) => `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const winChance = auctionTickets > 0 ? Math.min(80, Math.round((0.1 + auctionTickets * 0.03) * 100)) : 0;

  return (
    <div className="py-3 space-y-3">
      <div className="text-center mb-2">
        <div className="inline-flex items-center gap-1.5 mb-0.5">
          <Tv className="text-primary" size={22} />
          <h1 className="text-lg font-bold text-foreground">Reklama & Auksion</h1>
        </div>
        <p className="text-xs text-muted-foreground">Reklama ko'ring, chipta yig'ing, auksionda yuting!</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-2xl p-2.5 card-3d text-center">
          <Ticket className="mx-auto text-primary mb-1" size={18} />
          <p className="text-lg font-bold text-foreground">{adTickets}</p>
          <p className="text-[10px] text-muted-foreground">Chiptalar</p>
        </div>
        <div className="bg-card rounded-2xl p-2.5 card-3d text-center">
          <Trophy className="mx-auto text-accent mb-1" size={18} />
          <p className="text-lg font-bold text-foreground">{auctionTickets}</p>
          <p className="text-[10px] text-muted-foreground">Auksionda</p>
        </div>
        <div className="bg-card rounded-2xl p-2.5 card-3d text-center">
          <Gift className="mx-auto text-success mb-1" size={18} />
          <p className="text-lg font-bold text-foreground">{totalAuctionWon}</p>
          <p className="text-[10px] text-muted-foreground">Yutilgan 🪙</p>
        </div>
      </div>

      {/* Ad watch card */}
      <div className="bg-card rounded-2xl p-4 card-3d">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
            <Tv size={15} className="text-primary" />
            Reklama ko'rish
          </h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {adsWatchedInSlot}/{MAX_ADS}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5 mb-3">
          <div className="gradient-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${(adsWatchedInSlot / MAX_ADS) * 100}%`, boxShadow: "0 2px 4px hsl(0 78% 50% / 0.3)" }} />
        </div>

        {adsWatchedInSlot >= MAX_ADS ? (
          <div className="text-center py-3">
            <Clock className="mx-auto text-muted-foreground mb-1" size={20} />
            <p className="text-xs text-muted-foreground">
              Keyingi reklamalar: <span className="font-bold text-primary">{fmt(adsTimeLeft.minutes, adsTimeLeft.seconds)}</span>
            </p>
          </div>
        ) : (
          <button onClick={() => setAdDialogOpen(true)} className="w-full gradient-primary text-primary-foreground font-bold py-3 rounded-2xl btn-3d text-sm flex items-center justify-center gap-2">
            <Tv size={16} />
            Reklama ko'rish (5/5 da +10 chipta)
          </button>
        )}
      </div>

      {/* Auction section */}
      <div className="bg-card rounded-2xl p-4 card-3d">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
            <Trophy size={15} className="text-accent" />
            Soatlik Auksion
          </h2>
          <div className="flex items-center gap-1 gradient-coin rounded-full px-2 py-0.5">
            <Clock size={12} className="text-white" />
            <span className="text-xs font-bold text-white">{fmt(timeLeft.minutes, timeLeft.seconds)}</span>
          </div>
        </div>
        <div className="bg-muted/50 rounded-2xl p-3 mb-3">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-muted-foreground">Sizning chiptalaringiz:</span>
            <span className="font-bold text-foreground">{auctionTickets} 🎟️</span>
          </div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-muted-foreground">Yutish ehtimoli:</span>
            <span className="font-bold text-primary">{winChance}%</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Sovrin:</span>
            <span className="font-bold text-accent-foreground">100 - 220 🪙</span>
          </div>
        </div>
        <button onClick={handleEnterAuction} disabled={adTickets <= 0} className="w-full gradient-coin text-white font-bold py-3 rounded-2xl btn-3d-accent text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          <Ticket size={16} />
          {adTickets > 0 ? `${adTickets} chiptani qo'yish` : "Chipta yig'ing"}
        </button>
      </div>

      {lastResult && (
        <div className={`rounded-2xl p-3 card-3d text-center text-sm font-medium ${lastResult.won ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          {lastResult.won ? `🎉 Oxirgi auksion: ${lastResult.prize} tanga yutdingiz!` : "😔 Oxirgi auksion: Yutolmadingiz"}
        </div>
      )}

      <div className="bg-card rounded-2xl p-3 card-3d">
        <h3 className="text-xs font-semibold text-foreground mb-2">📋 Qoidalar</h3>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          <li>• 5 ta reklama ko'ring — 10 ta chipta oling</li>
          <li>• Har 10 daqiqada yangilanadi</li>
          <li>• Chiptalarni soatlik auksionga qo'ying</li>
          <li>• Ko'p chipta = yuqori yutish ehtimoli</li>
          <li>• Yutish: 100 dan 220 gacha tanga</li>
        </ul>
      </div>

      <AdWatchDialog
        open={adDialogOpen}
        onOpenChange={setAdDialogOpen}
        onWatch={handleWatchAd}
        adsWatched={adsWatchedInSlot}
        maxAds={MAX_ADS}
        reward="+2 chipta"
      />
    </div>
  );
};

export default ReklamaPage;
