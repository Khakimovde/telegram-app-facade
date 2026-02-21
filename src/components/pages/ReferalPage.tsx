import { useEffect } from "react";
import { Share2, TrendingUp, Copy } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { getUserLevel, LEVELS } from "@/lib/api";

const ReferalPage = () => {
  const { user, refreshUser } = useUser();

  // Refresh user data on mount to get latest referral count
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);
  if (!user) return null;

  const lvl = getUserLevel(user.referral_count);
  const refLink = `https://t.me/LunaraPay_bot?start=ref_${user.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(refLink).then(() => toast.success("📋 Havola nusxalandi!")).catch(() => toast.info("Havolani qo'lda nusxalang"));
  };

  const shareLink = () => {
    const text = `🎁 LunaraPay botda pul ishlang! Mening referal havolam orqali boshlang va bonus oling!\n\n${refLink}`;
    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("🎁 LunaraPay botda pul ishlang! Bonus oling!")}`;
    
    // In Telegram WebApp, use Telegram's share
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(tgShareUrl);
    } else if (navigator.share) {
      navigator.share({ title: "LunaraPay Bot", text, url: refLink });
    } else {
      copyLink();
    }
  };

  return (
    <div className="py-3 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center text-2xl">👥</div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Referal dasturi</h1>
          <p className="text-xs text-muted-foreground">Do'stlaringiz ishlaganidan foiz oling</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-lg p-2.5 card-shadow text-center">
          <p className="text-xl font-bold text-foreground">{user.referral_count}</p>
          <p className="text-[10px] text-muted-foreground">Do'stlar</p>
        </div>
        <div className="bg-card rounded-lg p-2.5 card-shadow text-center">
          <p className="text-xl font-bold text-success">{lvl.percent}%</p>
          <p className="text-[10px] text-muted-foreground">Foiz</p>
        </div>
        <div className="bg-card rounded-lg p-2.5 card-shadow text-center">
          <div className="flex items-center justify-center gap-0.5">
            <span className="text-sm">🪙</span>
            <span className="text-xl font-bold text-accent-foreground">{user.referral_earnings}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Daromad</p>
        </div>
      </div>

      <div className="bg-card rounded-lg p-3 card-shadow">
        <h3 className="font-semibold text-foreground text-sm mb-2">📖 Qanday ishlaydi?</h3>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p><span className="inline-flex items-center justify-center w-4 h-4 rounded bg-primary text-primary-foreground text-[10px] font-bold mr-1.5">1</span>Do'stingizga referal havolani yuboring</p>
          <p><span className="inline-flex items-center justify-center w-4 h-4 rounded bg-primary text-primary-foreground text-[10px] font-bold mr-1.5">2</span>U @LunaraPay_bot dan boshlaydi va sizga <strong className="text-success">{lvl.percent}%</strong> beriladi</p>
          <p><span className="inline-flex items-center justify-center w-4 h-4 rounded bg-primary text-primary-foreground text-[10px] font-bold mr-1.5">3</span>Ko'proq taklif = yuqori foiz (25% gacha)</p>
        </div>
      </div>

      <div className="bg-card rounded-lg p-3 card-shadow">
        <h3 className="font-semibold text-foreground text-sm mb-2">Referal havolangiz</h3>
        <div className="flex items-center gap-2 bg-input rounded-lg px-3 py-2 mb-2">
          <p className="text-xs text-muted-foreground flex-1 truncate">{refLink}</p>
          <button onClick={copyLink} className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 active:scale-95 transition-transform">
            <Copy size={14} className="text-muted-foreground" />
          </button>
        </div>
        <button onClick={shareLink} className="w-full gradient-primary text-primary-foreground font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-sm">
          <Share2 size={16} />
          Do'stlarni taklif qilish
        </button>
      </div>

      <div className="bg-card rounded-lg p-3 card-shadow">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="text-primary" size={16} />
          <h3 className="font-semibold text-foreground text-sm">Darajangiz: {lvl.emoji} {lvl.name}</h3>
        </div>
        {lvl.level >= 5 ? (
          <p className="text-xs text-success text-center">🎉 Maksimal darajaga yetdingiz!</p>
        ) : (
          <div>
            <div className="w-full bg-muted rounded-full h-2 mt-2 mb-1">
              <div className="gradient-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (user.referral_count / LEVELS[lvl.level].minReferrals) * 100)}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Keyingi daraja uchun {LEVELS[lvl.level].minReferrals - user.referral_count} ta referal kerak
            </p>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-foreground text-sm mb-2">Darajalar</h3>
        <div className="grid grid-cols-5 gap-1.5">
          {LEVELS.map((l) => (
            <div key={l.level} className={`rounded-lg p-2 text-center card-shadow ${l.level === lvl.level ? "bg-card ring-2 ring-primary" : "bg-card"}`}>
              <div className="text-lg mb-0.5">{l.emoji}</div>
              <p className="text-xs font-bold text-foreground">{l.percent}%</p>
              <p className="text-[10px] text-muted-foreground">{l.minReferrals}+</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReferalPage;
