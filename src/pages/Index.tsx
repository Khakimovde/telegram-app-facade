import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useSettings } from "@/contexts/SettingsContext";
import { getTelegramUser } from "@/lib/api";
import { t } from "@/lib/i18n";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import NotificationsPanel from "@/components/NotificationsPanel";
import VazifalarPage from "@/components/pages/VazifalarPage";
import TeamGamePage from "@/components/pages/TeamGamePage";
import BonusDayPage from "@/components/pages/BonusDayPage";
import ReferalPage from "@/components/pages/ReferalPage";
import TopPage from "@/components/pages/TopPage";
import ProfilPage from "@/components/pages/ProfilPage";
import AdminPage from "@/components/pages/AdminPage";

const ADMIN_PASSWORD = "Azizbek335161606";

const Index = () => {
  const [activeTab, setActiveTab] = useState("vazifalar");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, loading, error, isAdmin } = useUser();
  const { lang } = useSettings();
  const isTelegram = !!getTelegramUser();

  if (!isTelegram) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center max-w-md mx-auto px-4">
        <div className="text-center">
          <p className="text-5xl mb-4">📱</p>
          <p className="text-lg font-bold text-foreground mb-2">{t("general.telegramOnly", lang)}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("general.telegramOnlyDesc", lang)}</p>
          <a
            href="https://t.me/LunaraPay_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold"
          >
            {t("general.openTelegram", lang)}
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center max-w-md mx-auto">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">{t("general.loading", lang)}</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center max-w-md mx-auto px-4">
        <div className="text-center">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="text-sm text-destructive font-medium mb-1">{t("general.error", lang)}</p>
          <p className="text-xs text-muted-foreground">{error || t("general.userNotFound", lang)}</p>
        </div>
      </div>
    );
  }

  const handleAdminTab = (tab: string) => {
    if (tab === "admin" && !adminUnlocked) {
      setActiveTab("admin-login");
      return;
    }
    setActiveTab(tab);
    setShowNotifications(false);
  };

  const handleAdminLogin = () => {
    if (adminPasswordInput === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setActiveTab("admin");
      setAdminPasswordError(false);
    } else {
      setAdminPasswordError(true);
    }
  };

  const renderPage = () => {
    if (showNotifications) {
      return <NotificationsPanel onClose={() => setShowNotifications(false)} />;
    }
    if (activeTab === "admin-login") {
      return (
        <div className="py-8 px-2">
          <div className="bg-card rounded-xl p-5 card-shadow max-w-sm mx-auto text-center space-y-4">
            <div className="text-4xl">🔐</div>
            <h2 className="text-base font-bold text-foreground">Admin Panel</h2>
            <p className="text-xs text-muted-foreground">Parol kiriting</p>
            <input
              type="password"
              value={adminPasswordInput}
              onChange={(e) => { setAdminPasswordInput(e.target.value); setAdminPasswordError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              placeholder="Parol"
              className={`w-full bg-input rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-foreground ${adminPasswordError ? "ring-2 ring-destructive" : ""}`}
            />
            {adminPasswordError && <p className="text-xs text-destructive">Noto'g'ri parol!</p>}
            <button
              onClick={handleAdminLogin}
              className="w-full gradient-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm"
            >
              Kirish
            </button>
          </div>
        </div>
      );
    }
    switch (activeTab) {
      case "vazifalar": return <VazifalarPage />;
      case "bonus": return <BonusDayPage />;
      case "oyin": return <TeamGamePage />;
      case "referal": return <ReferalPage />;
      case "top": return <TopPage />;
      case "profil": return <ProfilPage />;
      case "admin": return <AdminPage />;
      default: return <VazifalarPage />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      <Header onNotificationsClick={() => setShowNotifications(!showNotifications)} />
      <main className="flex-1 overflow-y-auto pb-20 px-4">
        {renderPage()}
      </main>
      <BottomNav activeTab={activeTab === "admin-login" ? "admin" : activeTab} onTabChange={handleAdminTab} />
    </div>
  );
};

export default Index;
