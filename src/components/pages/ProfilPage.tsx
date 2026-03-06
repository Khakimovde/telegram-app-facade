import { useState, useEffect } from "react";
import { TrendingUp, Users, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { getUserLevel, LEVELS, tangaToSom, requestWithdraw, fetchUserWithdrawHistory, getTelegramUser, type DbWithdrawRequest } from "@/lib/api";

const statusConfig = {
  pending: { label: "So'rov yuborildi", color: "text-accent-foreground", bg: "bg-accent/20", border: "border-accent" },
  processing: { label: "O'tkazish jarayonida", color: "text-primary", bg: "bg-primary/10", border: "border-primary" },
  success: { label: "To'landi ✅", color: "text-success", bg: "bg-success/10", border: "border-success" },
  rejected: { label: "Rad etildi", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive" },
};

const ProfilPage = () => {
  const { user, refreshUser } = useUser();
  const [tangaAmount, setTangaAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<DbWithdrawRequest[]>([]);

  const tgUser = getTelegramUser()?.user;
  const photoUrl = tgUser?.photo_url;

  useEffect(() => {
    if (user) {
      fetchUserWithdrawHistory(user.id).then(setHistory);
    }
  }, [user]);

  if (!user) return null;

  const lvl = getUserLevel(user.referral_count);

  const withdraw = async () => {
    const amount = parseInt(tangaAmount);
    if (!amount || amount < 10000) { toast.error("Minimal 10 000 tanga kiriting!"); return; }
    if (user.balance < amount) { toast.error("Asosiy balans yetarli emas!"); return; }
    
    // Check bonus balance requirement (13%)
    const requiredBonus = Math.floor(amount * 0.13);
    if ((user.bonus_balance || 0) < requiredBonus) {
      toast.error(`Bonus tanga yetarli emas! ${amount.toLocaleString()} tanga yechish uchun ${requiredBonus.toLocaleString()} bonus tanga kerak. Sizda: ${(user.bonus_balance || 0).toLocaleString()} bonus tanga.`);
      return;
    }

    const cleanCard = cardNumber.replace(/\s/g, "");
    if (cleanCard.length !== 16) { toast.error("16 xonali karta raqamini kiriting!"); return; }
    setIsProcessing(true);
    try {
      const formatted = cleanCard.replace(/(\d{4})/g, "$1 ").trim();
      const result = await requestWithdraw(user.id, amount, formatted);
      if (result.success) {
        toast.success(`✅ So'rov yuborildi! ${amount} tanga → ${tangaToSom(amount).toLocaleString()} so'm`);
        setTangaAmount(""); setCardNumber("");
        await refreshUser();
        const newHistory = await fetchUserWithdrawHistory(user.id);
        setHistory(newHistory);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Xatolik yuz berdi!");
    } finally { setIsProcessing(false); }
  };

  const requiredBonusPreview = tangaAmount ? Math.floor(parseInt(tangaAmount) * 0.13) : 0;

  return (
    <div className="py-3 space-y-3">
      <div className="bg-card rounded-lg p-3 card-shadow flex items-center gap-2.5">
        <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0">
          {photoUrl ? (
            <img src={photoUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-foreground text-sm">{user.name}</h2>
          <p className="text-[10px] text-muted-foreground">{user.username} · ID: {user.id}</p>
          <p className="text-xs">{lvl.emoji} <span className="text-accent-foreground font-medium">{lvl.name}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card rounded-lg p-3 card-shadow text-center">
          <span className="text-lg">🪙</span>
          <p className="text-xl font-bold text-foreground">{user.balance.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">Tangalar</p>
        </div>
        <div className="bg-card rounded-lg p-3 card-shadow text-center">
          <Users className="mx-auto text-primary" size={20} />
          <p className="text-xl font-bold text-foreground">{user.referral_count}</p>
          <p className="text-[10px] text-muted-foreground">Referallar</p>
        </div>
      </div>

      <div className="bg-card rounded-lg p-3 card-shadow flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
          <TrendingUp className="text-success" size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground">Referal daromadi</p>
          <p className="font-semibold text-foreground text-xs">Do'stlaringizdan</p>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-sm">🪙</span>
          <span className="text-base font-bold text-accent-foreground">{user.referral_earnings}</span>
        </div>
      </div>

      <div className="bg-card rounded-lg p-3 card-shadow">
        <div className="flex items-center gap-1.5 mb-1.5">
          <TrendingUp className="text-primary" size={14} />
          <h3 className="font-semibold text-foreground text-xs">Daraja taraqqiyoti</h3>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mb-1">
          <div className="gradient-primary h-2 rounded-full" style={{ width: user.level >= 5 ? "100%" : `${(user.referral_count / LEVELS[user.level].minReferrals) * 100}%` }} />
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">{lvl.emoji} Lv.{lvl.level}</span>
          {user.level >= 5 ? (
            <span className="font-bold text-success">MAX ✓</span>
          ) : (
            <span className="text-muted-foreground">{LEVELS[user.level].minReferrals} referal kerak</span>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg p-3 card-shadow">
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-sm">💳</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Pul yechish</h3>
            <p className="text-[10px] text-muted-foreground">8 500 tanga = 10 000 so'm</p>
          </div>
        </div>
        <input type="number" value={tangaAmount} onChange={(e) => setTangaAmount(e.target.value)} placeholder="Tanga miqdori (min: 10 000)" className="w-full bg-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 mb-2" disabled={isProcessing} />
        
        {/* Bonus requirement info */}
        {tangaAmount && parseInt(tangaAmount) >= 10000 && (
          <div className={`rounded-lg p-2 mb-2 text-[11px] ${(user.bonus_balance || 0) >= requiredBonusPreview ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            <p>🎁 Kerakli bonus tanga: <strong>{requiredBonusPreview.toLocaleString()}</strong></p>
            <p>Sizda: <strong>{(user.bonus_balance || 0).toLocaleString()}</strong> bonus tanga {(user.bonus_balance || 0) >= requiredBonusPreview ? "✅" : "❌"}</p>
          </div>
        )}

        <input type="text" inputMode="numeric" value={cardNumber} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 16); setCardNumber(v); }} placeholder="Karta raqami (16 ta raqam)" className="w-full bg-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 mb-1.5" disabled={isProcessing} maxLength={16} />
        <p className="text-[10px] text-muted-foreground mb-2">💳 Uzcard va Humo kartalari qabul qilinadi</p>
        <button onClick={withdraw} disabled={isProcessing} className="w-full gradient-primary text-primary-foreground font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-sm disabled:opacity-70">
          {isProcessing ? (<><Loader2 size={16} className="animate-spin" /> O'tkazilmoqda...</>) : (<>💳 Pul yechish</>)}
        </button>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">📅 To'lovlar 24 soat ichida amalga oshiriladi</p>
      </div>

      <div className="bg-card rounded-lg p-3 card-shadow">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Clock className="text-muted-foreground" size={14} />
          <h3 className="font-semibold text-foreground text-xs">To'lovlar tarixi</h3>
        </div>
        <div className="space-y-2">
          {history.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Hali to'lovlar yo'q</p>
          )}
          {history.map((p) => {
            const cfg = statusConfig[p.status as keyof typeof statusConfig] || statusConfig.pending;
            const dateStr = new Date(p.created_at).toLocaleString("uz-UZ");
            return (
              <div key={p.id} className={`rounded-lg p-2.5 border-l-[3px] ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1">
                    {p.status === "success" ? <CheckCircle2 className="text-success" size={13} /> :
                     p.status === "rejected" ? <XCircle className="text-destructive" size={13} /> :
                     p.status === "processing" ? <Loader2 className="text-primary animate-spin" size={13} /> :
                     <Clock className="text-accent-foreground" size={13} />}
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                </div>
                <p className="text-xs text-foreground">
                  <strong>{p.tanga.toLocaleString()} tanga</strong> → <span className="text-success font-bold">{p.som.toLocaleString()} so'm</span>
                </p>
                <p className="text-[10px] text-muted-foreground">💳 {p.card}</p>
                {p.reason && (
                  <div className="mt-1 bg-destructive/10 rounded px-2 py-1">
                    <p className="text-[10px] font-medium text-destructive">❌ Sabab: {p.reason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProfilPage;
