import { useState, useEffect, useCallback, useRef } from "react";
import { Swords, Tv, Clock, Trophy, History, Users } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import AdWatchDialog from "@/components/AdWatchDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { teamGameJoin, teamGameWatchAd, teamGameStatus, teamGameHistory } from "@/lib/api";

interface RoundData {
  id: string;
  started_at: string;
  red_ads: number;
  blue_ads: number;
  status: string;
  winning_team?: string;
}

interface PlayerData {
  id: string;
  team: string;
  ads_watched: number;
  prize: number;
}

interface HistoryItem {
  id: string;
  team: string;
  ads_watched: number;
  prize: number;
  created_at: string;
  team_game_rounds: {
    winning_team: string;
    red_ads: number;
    blue_ads: number;
    ended_at: string;
  };
}

interface UserResult {
  won: boolean;
  team: string;
  prize: number;
  winningTeam: string;
  roundId: string;
}

const TeamGamePage = () => {
  const { user, refreshUser } = useUser();
  const [round, setRound] = useState<RoundData | null>(null);
  const [myPlayer, setMyPlayer] = useState<PlayerData | null>(null);
  const [redPlayers, setRedPlayers] = useState(0);
  const [bluePlayers, setBluePlayers] = useState(0);
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [resultModal, setResultModal] = useState<UserResult | null>(null);
  const [joining, setJoining] = useState(false);
  const shownResultRef = useRef<string | null>(null);
  const timerTriggeredRef = useRef(false);

  // Timer - counts down to next :00 or :30
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const min = now.getMinutes();
      const sec = now.getSeconds();
      const nextSlot = min < 30 ? 30 : 60;
      const totalRemaining = (nextSlot - min - 1) * 60 + (59 - sec);

      const newMinutes = Math.floor(totalRemaining / 60);
      const newSeconds = totalRemaining % 60;

      setTimeLeft({ minutes: newMinutes, seconds: newSeconds });

      // When timer hits 0, trigger resolution
      if (totalRemaining <= 0 && !timerTriggeredRef.current) {
        timerTriggeredRef.current = true;
        // Small delay to ensure server-side time has also passed
        setTimeout(() => {
          // Force a fresh status check that will resolve the round
          window.dispatchEvent(new CustomEvent("team-game-resolve"));
        }, 2000);
      }

      // Reset trigger flag when we're past the 0 mark (new slot)
      if (totalRemaining > 2) {
        timerTriggeredRef.current = false;
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = useCallback(async () => {
    if (!user) return;
    try {
      const data = await teamGameStatus(user.id);

      // If server resolved a round and user participated, show result modal ONCE
      if (data.userResult && data.userResult.winningTeam && data.userResult.roundId) {
        if (shownResultRef.current !== data.userResult.roundId) {
          shownResultRef.current = data.userResult.roundId;
          setResultModal(data.userResult);
          setMyPlayer(null);
          await refreshUser();
          const histData = await teamGameHistory(user.id);
          setHistory(histData);
        }
      }

      if (data.round) {
        setRound(data.round);
        setRedPlayers(data.redPlayers || 0);
        setBluePlayers(data.bluePlayers || 0);
        if (data.myPlayer) setMyPlayer(data.myPlayer);
      }
    } catch {
      // silent
    }
  }, [user, refreshUser]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Poll every 10s
  useEffect(() => {
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  // Listen for timer-triggered resolution
  useEffect(() => {
    const handler = () => {
      loadStatus();
    };
    window.addEventListener("team-game-resolve", handler);
    return () => window.removeEventListener("team-game-resolve", handler);
  }, [loadStatus]);

  const handleJoin = async () => {
    if (!user || joining) return;
    setJoining(true);
    try {
      const data = await teamGameJoin(user.id);
      setRound(data.round);
      setMyPlayer(data.player);
      shownResultRef.current = null;
      const teamEmoji = data.player.team === "red" ? "🔴" : "🔵";
      toast.success(`${teamEmoji} ${data.player.team === "red" ? "Qizil" : "Ko'k"} jamoaga qo'shildingiz!`);
    } catch {
      toast.error("Xatolik yuz berdi");
    } finally {
      setJoining(false);
    }
  };

  const handleWatchAd = async () => {
    if (!user) return;
    try {
      const result = await teamGameWatchAd(user.id);
      if (result.success) {
        toast.success("📺 Reklama ko'rildi! Jamoangiz uchun +1");
        setRound((prev) => prev ? {
          ...prev,
          red_ads: result.red_ads ?? prev.red_ads,
          blue_ads: result.blue_ads ?? prev.blue_ads,
        } : prev);
        setMyPlayer((prev) => prev ? { ...prev, ads_watched: result.player_ads } : prev);
        await refreshUser();
      }
    } catch (e: any) {
      if (e?.message?.includes("ended")) {
        toast.info("⏰ Raund tugadi, natijalar tez orada chiqadi");
        loadStatus();
      } else {
        toast.error("Xatolik yuz berdi");
      }
    }
  };

  const totalAds = (round?.red_ads || 0) + (round?.blue_ads || 0);
  const redPercent = totalAds > 0 ? Math.round(((round?.red_ads || 0) / totalAds) * 100) : 50;
  const bluePercent = 100 - redPercent;
  const fmt = (m: number, s: number) => `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="py-3 space-y-3">
      {/* Header */}
      <div className="text-center mb-1">
        <div className="inline-flex items-center gap-1.5 mb-0.5">
          <Swords className="text-accent" size={22} />
          <h1 className="text-lg font-bold text-foreground">Jamoaviy O'yin</h1>
        </div>
        <p className="text-xs text-muted-foreground">Jamoangiz uchun reklama ko'ring va yuting!</p>
      </div>

      {/* Timer */}
      <div className="bg-card rounded-xl p-3 card-shadow border border-accent/20">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Clock size={16} className="text-destructive" />
          <span className="text-xs text-muted-foreground">Raund tugashiga:</span>
          <span className="text-xl font-mono font-bold text-destructive">{fmt(timeLeft.minutes, timeLeft.seconds)}</span>
        </div>

        {/* Battle Arena */}
        <div className="relative mb-3">
          <div className="h-10 rounded-xl overflow-hidden flex bg-muted/30 border border-border">
            <div
              className="h-full transition-all duration-700 ease-out flex items-center justify-center relative"
              style={{
                width: `${redPercent}%`,
                background: "linear-gradient(135deg, hsl(0 72% 51%), hsl(0 72% 40%))",
                minWidth: "15%",
              }}
            >
              <span className="text-[11px] font-bold text-white drop-shadow-md z-10">
                🔴 {redPercent}%
              </span>
            </div>
            <div
              className="h-full transition-all duration-700 ease-out flex items-center justify-center relative"
              style={{
                width: `${bluePercent}%`,
                background: "linear-gradient(135deg, hsl(213 80% 50%), hsl(213 80% 38%))",
                minWidth: "15%",
              }}
            >
              <span className="text-[11px] font-bold text-white drop-shadow-md z-10">
                {bluePercent}% 🔵
              </span>
            </div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card border-2 border-accent flex items-center justify-center shadow-lg z-10">
            <span className="text-[10px] font-black text-accent">VS</span>
          </div>
        </div>

        {/* Team stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2.5 text-center border" style={{ borderColor: "hsl(0 72% 51% / 0.3)", background: "hsl(0 72% 51% / 0.08)" }}>
            <p className="text-xs font-bold" style={{ color: "hsl(0 72% 51%)" }}>🔴 Qizil</p>
            <p className="text-lg font-bold text-foreground">{round?.red_ads || 0}</p>
            <p className="text-[9px] text-muted-foreground">reklama</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Users size={10} className="text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">{redPlayers}</span>
            </div>
          </div>
          <div className="rounded-lg p-2.5 text-center border" style={{ borderColor: "hsl(213 80% 50% / 0.3)", background: "hsl(213 80% 50% / 0.08)" }}>
            <p className="text-xs font-bold" style={{ color: "hsl(213 80% 50%)" }}>🔵 Ko'k</p>
            <p className="text-lg font-bold text-foreground">{round?.blue_ads || 0}</p>
            <p className="text-[9px] text-muted-foreground">reklama</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Users size={10} className="text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">{bluePlayers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Your team & action */}
      <div className="bg-card rounded-xl p-4 card-shadow">
        {!myPlayer ? (
          <div className="text-center space-y-3">
            <div className="text-3xl">⚔️</div>
            <p className="text-sm font-semibold text-foreground">O'yinga kirish</p>
            <p className="text-xs text-muted-foreground">Sizga tasodifiy jamoa beriladi</p>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-lg active:scale-[0.97] transition-transform text-sm disabled:opacity-50"
            >
              {joining ? "Kirilmoqda..." : "Jamoaga qo'shilish"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                  style={{
                    background: myPlayer.team === "red"
                      ? "linear-gradient(135deg, hsl(0 72% 51%), hsl(0 72% 40%))"
                      : "linear-gradient(135deg, hsl(213 80% 50%), hsl(213 80% 38%))",
                  }}
                >
                  {myPlayer.team === "red" ? "🔴" : "🔵"}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {myPlayer.team === "red" ? "Qizil" : "Ko'k"} jamoa
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Sizning reklamalaringiz: {myPlayer.ads_watched}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Yutish ehtimoli</p>
                <p className="text-lg font-bold" style={{
                  color: myPlayer.team === "red" ? "hsl(0 72% 51%)" : "hsl(213 80% 50%)"
                }}>
                  {myPlayer.team === "red" ? redPercent : bluePercent}%
                </p>
              </div>
            </div>

            <button
              onClick={() => setAdDialogOpen(true)}
              className="w-full font-semibold py-3 rounded-lg active:scale-[0.98] transition-transform text-sm flex items-center justify-center gap-2 text-white"
              style={{
                background: myPlayer.team === "red"
                  ? "linear-gradient(135deg, hsl(0 72% 51%), hsl(0 72% 40%))"
                  : "linear-gradient(135deg, hsl(213 80% 50%), hsl(213 80% 38%))",
              }}
            >
              <Tv size={16} />
              Reklama ko'rish (Jamoangiz uchun +1)
            </button>
          </div>
        )}
      </div>

      {/* Prize info */}
      <div className="bg-card rounded-xl p-3 card-shadow flex items-center justify-center gap-3 text-xs">
        <Trophy size={14} className="text-accent" />
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">G'olib:</span>
          <span className="font-bold text-accent">30 🪙</span>
          <span className="text-muted-foreground mx-1">|</span>
          <span className="text-muted-foreground">Yutqazganlar:</span>
          <span className="font-bold text-muted-foreground">10 🪙</span>
        </div>
      </div>

      {/* History */}
      <div className="bg-card rounded-xl p-3 card-shadow">
        <button
          onClick={async () => {
            if (!showHistory && user) {
              const h = await teamGameHistory(user.id);
              setHistory(h);
            }
            setShowHistory(!showHistory);
          }}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <History size={14} className="text-primary" />
            O'yin tarixi
          </h3>
          <span className="text-[10px] text-muted-foreground">{showHistory ? "Yopish ▲" : "Ko'rish ▼"}</span>
        </button>

        {showHistory && (
          <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-2">Hali qatnashmadingiz</p>
            ) : (
              history.map((h) => {
                const won = h.team_game_rounds?.winning_team === h.team;
                return (
                  <div key={h.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${won ? "bg-accent/10 border border-accent/20" : "bg-muted/50"}`}>
                    <div className="flex items-center gap-2">
                      <span>{won ? "🏆" : "😔"}</span>
                      <div>
                        <span className={`font-semibold ${won ? "text-accent" : "text-muted-foreground"}`}>
                          {won ? "Yutdingiz!" : "Yutkizdingiz"}
                        </span>
                        <p className="text-[9px] text-muted-foreground">
                          {h.team === "red" ? "🔴" : "🔵"} {h.team_game_rounds ? formatDate(h.team_game_rounds.ended_at || h.created_at) : formatDate(h.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground">{h.ads_watched} reklama</span>
                      <span className={`font-bold ${won ? "text-accent" : "text-foreground"}`}>+{h.prize} 🪙</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Rules */}
      <div className="bg-card rounded-xl p-3 card-shadow">
        <h3 className="text-xs font-semibold text-foreground mb-2">📋 Qoidalar</h3>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          <li>• O'yinga kirganingizda tasodifiy jamoa beriladi (🔴 yoki 🔵)</li>
          <li>• Jamoangiz uchun reklama ko'ring — har biri +1</li>
          <li>• Ko'p reklama = yuqori yutish ehtimoli</li>
          <li>• Raund har 30 daqiqada o'tkaziladi (00 va 30 daqiqalarda)</li>
          <li>• G'olib jamoa: 30 tanga | Yutqazganlar: 10 tanga</li>
          <li>• Kamida 1 ta reklama ko'rgan o'yinchilar mukofot oladi</li>
        </ul>
      </div>

      {/* Result Modal — only shown to participants */}
      <Dialog open={!!resultModal} onOpenChange={(v) => { if (!v) setResultModal(null); }}>
        <DialogContent className="max-w-[340px] rounded-2xl p-0 overflow-hidden border-none">
          <div
            className="p-5 text-center"
            style={{
              background: resultModal?.won
                ? "linear-gradient(135deg, hsl(43 96% 56% / 0.25), hsl(43 96% 56% / 0.1))"
                : "linear-gradient(135deg, hsl(0 72% 51% / 0.15), hsl(0 72% 51% / 0.05))",
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-foreground text-base font-bold">
                {resultModal?.won ? "🎉 Tabriklaymiz!" : "😔 Afsus..."}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-5 space-y-3 text-center">
            <div className="text-5xl mb-2">{resultModal?.won ? "🏆" : "😔"}</div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{
                  background: resultModal?.winningTeam === "red"
                    ? "hsl(0 72% 51%)"
                    : "hsl(213 80% 50%)",
                }}
              >
                {resultModal?.winningTeam === "red" ? "🔴 Qizil" : "🔵 Ko'k"} yutdi!
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {resultModal?.won
                ? `Siz ${resultModal.prize} tanga yutdingiz!`
                : `Sizga ${resultModal?.prize || 10} tanga berildi.`}
            </p>
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
        reward="Jamoangiz uchun +1"
        timerDuration={15}
        unlimited
      />
    </div>
  );
};

export default TeamGamePage;
