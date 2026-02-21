import { useState, useEffect, useCallback, useRef } from "react";
import { Trophy, Ticket, Clock, Gift, Users, Crown, Tv, History } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import AdWatchDialog from "@/components/AdWatchDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  watchAd,
  enterAuction,
  getUserAuctionTickets,
  getAuctionParticipants,
  getLastAuctionWinner,
  fetchAuctionResults,
  getUserLevel,
  type DbAuctionResult,
  type DbUser,
} from "@/lib/api";

const AuksionPage = () => {
  const { user, refreshUser } = useUser();
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });
  const [myTickets, setMyTickets] = useState(0);
  const [participants, setParticipants] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const [myEnteredTickets, setMyEnteredTickets] = useState(0);
  const [lastWinner, setLastWinner] = useState<(DbAuctionResult & { user?: DbUser }) | null>(null);
  const [myHistory, setMyHistory] = useState<DbAuctionResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [resultModal, setResultModal] = useState<DbAuctionResult | null>(null);
  const lastResultId = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [tickets, pData, winner, history] = await Promise.all([
      getUserAuctionTickets(user.id),
      getAuctionParticipants(user.id),
      getLastAuctionWinner(),
      fetchAuctionResults(user.id),
    ]);
    setMyTickets(tickets);
    setParticipants(pData.participants);
    setTotalTickets(pData.totalTickets);
    setMyEnteredTickets(pData.myEnteredTickets || 0);
    setLastWinner(winner);
    setMyHistory(history);

    // Check for new result to show modal
    if (history.length > 0 && lastResultId.current && history[0].id !== lastResultId.current) {
      setResultModal(history[0]);
    }
    if (history.length > 0) {
      lastResultId.current = history[0].id;
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const min = now.getMinutes();
      const sec = now.getSeconds();
      const nextSlot = min < 30 ? 30 : 60;
      const diffSec = (nextSlot - min) * 60 - sec;
      setTimeLeft({ minutes: Math.floor(diffSec / 60), seconds: diffSec % 60 });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleWatchAd = async () => {
    if (!user) return;
    try {
      const result = await watchAd(user.id, "reklama");
      if (result.success) {
        toast.success(`🎫 +2 chipta olindi!`);
        await refreshUser();
        loadData();
      }
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  const handleEnterAuction = async () => {
    if (myTickets <= 0 || !user) {
      toast.error("Chiptangiz yo'q! Pastda reklama ko'rib chipta oling.");
      return;
    }
    try {
      const result = await enterAuction(user.id);
      toast.success(`🎟️ ${myTickets} ta chipta auksionga qo'yildi!`);
      if (result.participants) setParticipants(result.participants);
      if (result.totalTickets) setTotalTickets(result.totalTickets);
      await refreshUser();
      loadData();
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  };

  const fmt = (m: number, s: number) => `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const winChance = totalTickets > 0 && myEnteredTickets > 0
    ? Math.round((myEnteredTickets / totalTickets) * 100)
    : 0;

  const winnerLevel = lastWinner?.user ? getUserLevel(lastWinner.user.referral_count) : null;

  return (
    <div className="py-3 space-y-3">
      <div className="text-center mb-1">
        <div className="inline-flex items-center gap-1.5 mb-0.5">
          <Trophy className="text-accent" size={22} />
          <h1 className="text-lg font-bold text-foreground">Auksion</h1>
        </div>
        <p className="text-xs text-muted-foreground">Chipta to'plang va auksionda yuting!</p>
      </div>

      <div className="bg-card rounded-xl p-4 card-shadow border border-accent/20">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Clock size={16} className="text-destructive" />
          <span className="text-xs text-muted-foreground">Auksion tugashiga:</span>
          <span className="text-xl font-mono font-bold text-destructive">{fmt(timeLeft.minutes, timeLeft.seconds)}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <Users size={14} className="mx-auto text-primary mb-0.5" />
            <p className="text-lg font-bold text-foreground">{participants}</p>
            <p className="text-[9px] text-muted-foreground">Qatnashchilar</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <Ticket size={14} className="mx-auto text-accent mb-0.5" />
            <p className="text-lg font-bold text-foreground">{totalTickets}</p>
            <p className="text-[9px] text-muted-foreground">Jami chiptalar</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <Trophy size={14} className="mx-auto text-primary mb-0.5" />
            <p className="text-lg font-bold text-primary">{winChance > 0 ? `${winChance}%` : "—"}</p>
            <p className="text-[9px] text-muted-foreground">Yutish foizi</p>
          </div>
        </div>

        <div className="bg-accent/10 rounded-lg p-3 mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Sizning chiptalaringiz</p>
            <p className="text-2xl font-bold text-foreground">{user?.tickets || 0} 🎟️</p>
          </div>
          <button
            onClick={handleEnterAuction}
            disabled={myTickets <= 0}
            className="gradient-primary text-primary-foreground font-semibold py-2.5 px-5 rounded-lg active:scale-[0.97] transition-transform text-sm disabled:opacity-50"
          >
            Qatnashish
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs">
          <Gift size={14} className="text-accent" />
          <span className="text-muted-foreground">G'olib:</span>
          <span className="font-bold text-accent">100—220 🪙</span>
          <span className="text-muted-foreground mx-1">|</span>
          <span className="text-muted-foreground">Boshqalar:</span>
          <span className="font-bold text-muted-foreground">20 🪙</span>
        </div>
      </div>

      {/* Last winner */}
      {lastWinner && lastWinner.won && (
        <div className="bg-card rounded-xl p-3 card-shadow border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Crown size={14} className="text-primary" />
            <span className="text-xs font-semibold text-foreground">Oldingi auksion g'olibi</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center">
              {lastWinner.user?.photo_url ? (
                <img src={lastWinner.user.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">{winnerLevel?.emoji || "🏆"}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm truncate">
                {lastWinner.user?.name || "Noma'lum"}
              </p>
              <p className="text-[10px] text-muted-foreground">ID: {lastWinner.user_id}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-accent">+{lastWinner.prize} 🪙</p>
              <p className="text-[9px] text-muted-foreground">{lastWinner.tickets_used} chipta</p>
            </div>
          </div>
        </div>
      )}

      {/* Get tickets - unlimited */}
      <div className="bg-card rounded-xl p-4 card-shadow">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
            <Tv size={15} className="text-primary" />
            Chipta olish
          </h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Cheksiz 🎟️
          </span>
        </div>

        <button
          onClick={() => setAdDialogOpen(true)}
          className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-lg active:scale-[0.98] transition-transform text-sm flex items-center justify-center gap-2"
        >
          <Tv size={16} />
          Chipta olish +2
        </button>
      </div>

      {/* Auction History */}
      <div className="bg-card rounded-xl p-3 card-shadow">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <History size={14} className="text-primary" />
            Auksion tarixi
          </h3>
          <span className="text-[10px] text-muted-foreground">{showHistory ? "Yopish ▲" : "Ko'rish ▼"}</span>
        </button>

        {showHistory && (
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
            {myHistory.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-2">Hali qatnashmadingiz</p>
            ) : (
              myHistory.map((r) => (
                <div key={r.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${r.won ? "bg-accent/10 border border-accent/20" : "bg-muted/50"}`}>
                  <div className="flex items-center gap-2">
                    <span>{r.won ? "🏆" : "😔"}</span>
                    <div>
                      <span className={`font-semibold ${r.won ? "text-accent" : "text-muted-foreground"}`}>
                        {r.won ? "Yutdingiz!" : "Yutkizdingiz"}
                      </span>
                      <p className="text-[9px] text-muted-foreground">{formatDate(r.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground">{r.tickets_used} chipta</span>
                    <span className={`font-bold ${r.won ? "text-accent" : "text-foreground"}`}>+{r.prize} 🪙</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="bg-card rounded-xl p-3 card-shadow">
        <h3 className="text-xs font-semibold text-foreground mb-2">📋 Qoidalar</h3>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          <li>• Cheksiz reklama ko'ring — har biri +2 chipta</li>
          <li>• Chiptalarni auksionga qo'ying — "Qatnashish" tugmasini bosing</li>
          <li>• Ko'p chipta = yuqori yutish ehtimoli</li>
          <li>• Auksion har 30 daqiqada o'tkaziladi</li>
          <li>• G'olib: 100—220 tanga | Boshqalar: 20 tanga</li>
        </ul>
      </div>

      {/* Result Modal */}
      <Dialog open={!!resultModal} onOpenChange={(v) => { if (!v) setResultModal(null); }}>
        <DialogContent className="max-w-[340px] rounded-2xl p-0 overflow-hidden border-none">
          <div className={`p-4 text-center ${resultModal?.won ? "bg-accent/20" : "bg-destructive/10"}`}>
            <DialogHeader>
              <DialogTitle className="text-foreground text-base font-bold">
                {resultModal?.won ? "🎉 Tabriklaymiz!" : "😔 Afsus..."}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-4 space-y-3 text-center">
            <div className="text-5xl mb-2">{resultModal?.won ? "🏆" : "😔"}</div>
            <p className="text-sm font-semibold text-foreground">
              {resultModal?.won
                ? `Siz ${resultModal.prize} tanga yutdingiz!`
                : `Siz yutkizdingiz. Sizga ${resultModal?.prize || 20} tanga berildi.`}
            </p>
            {lastWinner && lastWinner.won && !resultModal?.won && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs">
                <p className="text-muted-foreground mb-1">G'olib:</p>
                <p className="font-bold text-foreground">{lastWinner.user?.name || "Noma'lum"}</p>
                <p className="text-[10px] text-muted-foreground">ID: {lastWinner.user_id}</p>
              </div>
            )}
            <button
              onClick={() => setResultModal(null)}
              className="w-full gradient-primary text-primary-foreground font-semibold py-2.5 rounded-xl text-sm"
            >
              Yopish
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AdWatchDialog
        open={adDialogOpen}
        onOpenChange={setAdDialogOpen}
        onWatch={handleWatchAd}
        adsWatched={0}
        maxAds={999}
        reward="+2 chipta"
        timerDuration={15}
        unlimited
      />
    </div>
  );
};

export default AuksionPage;
