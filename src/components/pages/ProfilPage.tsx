import { useState, useEffect } from "react";
import { TrendingUp, Users, Clock, CheckCircle2, XCircle, Loader2, Settings, CreditCard, Sun, Moon, Globe, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { useSettings } from "@/contexts/SettingsContext";
import { t, LANGUAGES, type Lang } from "@/lib/i18n";
import { getUserLevel, LEVELS, tangaToSom, requestWithdraw, fetchUserWithdrawHistory, getTelegramUser, type DbWithdrawRequest } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ProfilPage = () => {
  const { user, refreshUser } = useUser();
  const { lang, setLang, theme, setTheme } = useSettings();
  const [tangaAmount, setTangaAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<DbWithdrawRequest[]>([]);
  const [activeSection, setActiveSection] = useState<"withdraw" | "settings">("withdraw");
  const [showLangDialog, setShowLangDialog] = useState(false);
  const [showThemeDialog, setShowThemeDialog] = useState(false);

  const tgUser = getTelegramUser()?.user;
  const photoUrl = tgUser?.photo_url;

  useEffect(() => {
    if (user) {
      fetchUserWithdrawHistory(user.id).then(setHistory);
    }
  }, [user]);

  if (!user) return null;

  const lvl = getUserLevel(user.referral_count);

  const statusConfig = {
    pending: { label: t("profile.requestSent", lang), color: "text-accent-foreground", bg: "bg-accent/20", border: "border-accent" },
    processing: { label: t("profile.transferring", lang), color: "text-primary", bg: "bg-primary/10", border: "border-primary" },
    success: { label: t("profile.paid", lang), color: "text-success", bg: "bg-success/10", border: "border-success" },
    rejected: { label: t("profile.rejected", lang), color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive" },
  };

  const withdraw = async () => {
    const amount = parseInt(tangaAmount);
    if (!amount || amount < 10000) { toast.error(t("profile.minAmount", lang)); return; }
    if (user.balance < amount) { toast.error(t("profile.insufficientBalance", lang)); return; }

    const requiredBonus = Math.floor(amount * 0.13);
    if ((user.bonus_balance || 0) < requiredBonus) {
      toast.error(t("profile.insufficientBonus", lang, {
        amount: amount.toLocaleString(),
        required: requiredBonus.toLocaleString(),
        have: (user.bonus_balance || 0).toLocaleString(),
      }));
      return;
    }

    const cleanCard = cardNumber.replace(/\s/g, "");
    if (cleanCard.length !== 16) { toast.error(t("profile.card16", lang)); return; }
    setIsProcessing(true);
    try {
      const formatted = cleanCard.replace(/(\d{4})/g, "$1 ").trim();
      const result = await requestWithdraw(user.id, amount, formatted);
      if (result.success) {
        toast.success(`✅ ${t("profile.requestSent", lang)}! ${amount} → ${tangaToSom(amount).toLocaleString()} so'm`);
        setTangaAmount(""); setCardNumber("");
        await refreshUser();
        const newHistory = await fetchUserWithdrawHistory(user.id);
        setHistory(newHistory);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("general.error", lang));
    } finally { setIsProcessing(false); }
  };

  const requiredBonusPreview = tangaAmount ? Math.floor(parseInt(tangaAmount) * 0.13) : 0;
  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div className="py-3 space-y-3">
      {/* Profile card */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card rounded-lg p-3 card-shadow text-center">
          <span className="text-lg">🪙</span>
          <p className="text-xl font-bold text-foreground">{user.balance.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">{t("profile.coins", lang)}</p>
        </div>
        <div className="bg-card rounded-lg p-3 card-shadow text-center">
          <Users className="mx-auto text-primary" size={20} />
          <p className="text-xl font-bold text-foreground">{user.referral_count}</p>
          <p className="text-[10px] text-muted-foreground">{t("profile.referrals", lang)}</p>
        </div>
      </div>

      {/* Referral earnings */}
      <div className="bg-card rounded-lg p-3 card-shadow flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
          <TrendingUp className="text-success" size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground">{t("profile.refEarnings", lang)}</p>
          <p className="font-semibold text-foreground text-xs">{t("profile.fromFriends", lang)}</p>
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-sm">🪙</span>
          <span className="text-base font-bold text-accent-foreground">{user.referral_earnings}</span>
        </div>
      </div>

      {/* Level progress */}
      <div className="bg-card rounded-lg p-3 card-shadow">
        <div className="flex items-center gap-1.5 mb-1.5">
          <TrendingUp className="text-primary" size={14} />
          <h3 className="font-semibold text-foreground text-xs">{t("profile.levelProgress", lang)}</h3>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mb-1">
          <div className="gradient-primary h-2 rounded-full" style={{ width: user.level >= 5 ? "100%" : `${(user.referral_count / LEVELS[user.level].minReferrals) * 100}%` }} />
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">{lvl.emoji} Lv.{lvl.level}</span>
          {user.level >= 5 ? (
            <span className="font-bold text-success">{t("profile.max", lang)}</span>
          ) : (
            <span className="text-muted-foreground">{t("profile.referralNeeded", lang, { count: LEVELS[user.level].minReferrals })}</span>
          )}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection("withdraw")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeSection === "withdraw"
              ? "gradient-primary text-primary-foreground"
              : "bg-card text-muted-foreground card-shadow"
          }`}
        >
          <CreditCard size={16} />
          {t("profile.withdraw", lang)}
        </button>
        <button
          onClick={() => setActiveSection("settings")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeSection === "settings"
              ? "gradient-primary text-primary-foreground"
              : "bg-card text-muted-foreground card-shadow"
          }`}
        >
          <Settings size={16} />
          {t("settings.title", lang)}
        </button>
      </div>

      {activeSection === "withdraw" && (
        <>
          {/* Withdraw form */}
          <div className="bg-card rounded-lg p-3 card-shadow">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
                <span className="text-primary-foreground text-sm">💳</span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">{t("profile.withdraw", lang)}</h3>
                <p className="text-[10px] text-muted-foreground">{t("profile.withdrawRate", lang)}</p>
              </div>
            </div>
            <input type="number" value={tangaAmount} onChange={(e) => setTangaAmount(e.target.value)} placeholder={t("profile.amountPlaceholder", lang)} className="w-full bg-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 mb-2 text-foreground" disabled={isProcessing} />

            {tangaAmount && parseInt(tangaAmount) >= 10000 && (
              <div className={`rounded-lg p-2 mb-2 text-[11px] ${(user.bonus_balance || 0) >= requiredBonusPreview ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                <p>{t("profile.bonusRequired", lang)}: <strong>{requiredBonusPreview.toLocaleString()}</strong></p>
                <p>{t("profile.youHave", lang)}: <strong>{(user.bonus_balance || 0).toLocaleString()}</strong> {(user.bonus_balance || 0) >= requiredBonusPreview ? "✅" : "❌"}</p>
              </div>
            )}

            <input type="text" inputMode="numeric" value={cardNumber} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 16); setCardNumber(v); }} placeholder={t("profile.cardPlaceholder", lang)} className="w-full bg-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 mb-1.5 text-foreground" disabled={isProcessing} maxLength={16} />
            <p className="text-[10px] text-muted-foreground mb-2">{t("profile.cardAccepted", lang)}</p>
            <button onClick={withdraw} disabled={isProcessing} className="w-full gradient-primary text-primary-foreground font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-sm disabled:opacity-70">
              {isProcessing ? (<><Loader2 size={16} className="animate-spin" /> {t("profile.processing", lang)}</>) : (<>{t("profile.withdrawBtn", lang)}</>)}
            </button>
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">{t("profile.paymentTime", lang)}</p>
          </div>

          {/* Payment history */}
          <div className="bg-card rounded-lg p-3 card-shadow">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Clock className="text-muted-foreground" size={14} />
              <h3 className="font-semibold text-foreground text-xs">{t("profile.history", lang)}</h3>
            </div>
            <div className="space-y-2">
              {history.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">{t("profile.noHistory", lang)}</p>
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
                        <p className="text-[10px] font-medium text-destructive">{t("profile.rejectedReason", lang)}: {p.reason}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeSection === "settings" && (
        <div className="space-y-2">
          {/* Theme setting */}
          <button
            onClick={() => setShowThemeDialog(true)}
            className="w-full bg-card rounded-lg p-3 card-shadow flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              {theme === "light" ? <Sun size={20} className="text-accent" /> : <Moon size={20} className="text-primary" />}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">{t("settings.theme", lang)}</p>
              <p className="text-[11px] text-muted-foreground">
                {theme === "light" ? t("settings.themeLight", lang) : t("settings.themeDark", lang)}
              </p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>

          {/* Language setting */}
          <button
            onClick={() => setShowLangDialog(true)}
            className="w-full bg-card rounded-lg p-3 card-shadow flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Globe size={20} className="text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">{t("settings.language", lang)}</p>
              <p className="text-[11px] text-muted-foreground">
                {currentLang.flag} {currentLang.name}
              </p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Language selection dialog */}
      <Dialog open={showLangDialog} onOpenChange={setShowLangDialog}>
        <DialogContent className="max-w-[340px] rounded-2xl p-0 overflow-hidden border-none card-3d">
          <div className="gradient-primary p-4 text-center">
            <DialogHeader>
              <DialogTitle className="text-primary-foreground text-base font-bold">
                🌍 {t("settings.selectLanguage", lang)}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-4 space-y-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setShowLangDialog(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.97] ${
                  lang === l.code
                    ? "bg-primary/10 ring-2 ring-primary"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <span className="text-2xl">{l.flag}</span>
                <span className={`text-sm font-semibold ${lang === l.code ? "text-primary" : "text-foreground"}`}>
                  {l.name}
                </span>
                {lang === l.code && <CheckCircle2 size={18} className="text-primary ml-auto" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Theme selection dialog */}
      <Dialog open={showThemeDialog} onOpenChange={setShowThemeDialog}>
        <DialogContent className="max-w-[340px] rounded-2xl p-0 overflow-hidden border-none card-3d">
          <div className="gradient-primary p-4 text-center">
            <DialogHeader>
              <DialogTitle className="text-primary-foreground text-base font-bold">
                🎨 {t("settings.selectTheme", lang)}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-4 space-y-2">
            <button
              onClick={() => { setTheme("light"); setShowThemeDialog(false); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.97] ${
                theme === "light"
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "bg-muted/50 hover:bg-muted"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center">
                <Sun size={20} className="text-accent" />
              </div>
              <span className={`text-sm font-semibold ${theme === "light" ? "text-primary" : "text-foreground"}`}>
                {t("settings.themeLight", lang)}
              </span>
              {theme === "light" && <CheckCircle2 size={18} className="text-primary ml-auto" />}
            </button>
            <button
              onClick={() => { setTheme("dark"); setShowThemeDialog(false); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.97] ${
                theme === "dark"
                  ? "bg-primary/10 ring-2 ring-primary"
                  : "bg-muted/50 hover:bg-muted"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-[hsl(220,15%,17%)] border border-border flex items-center justify-center">
                <Moon size={20} className="text-blue-300" />
              </div>
              <span className={`text-sm font-semibold ${theme === "dark" ? "text-primary" : "text-foreground"}`}>
                {t("settings.themeDark", lang)}
              </span>
              {theme === "dark" && <CheckCircle2 size={18} className="text-primary ml-auto" />}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilPage;
