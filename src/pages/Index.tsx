import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import VazifalarPage from "@/components/pages/VazifalarPage";
import TeamGamePage from "@/components/pages/TeamGamePage";
import ReferalPage from "@/components/pages/ReferalPage";
import TopPage from "@/components/pages/TopPage";
import ProfilPage from "@/components/pages/ProfilPage";
import AdminPage from "@/components/pages/AdminPage";

const Index = () => {
  const [activeTab, setActiveTab] = useState("vazifalar");
  const { user, loading, error } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center max-w-md mx-auto">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center max-w-md mx-auto px-4">
        <div className="text-center">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="text-sm text-destructive font-medium mb-1">Xatolik</p>
          <p className="text-xs text-muted-foreground">{error || "Foydalanuvchi topilmadi"}</p>
          <a
            href="https://t.me/LunaraPay_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            🚀 Telegram orqali ochish
          </a>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case "vazifalar": return <VazifalarPage />;
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
      <Header />
      <main className="flex-1 overflow-y-auto pb-20 px-4">
        {renderPage()}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
