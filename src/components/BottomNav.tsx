import { ListChecks, Gift, Trophy, Users, Tv, User, Settings } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useSettings } from "@/contexts/SettingsContext";
import { t } from "@/lib/i18n";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const { isAdmin, bonusDayActive } = useUser();
  const { lang } = useSettings();

  const tabs = [
    { id: "vazifalar", label: t("nav.tasks", lang), icon: ListChecks },
    ...(bonusDayActive ? [{ id: "bonus", label: t("nav.bonus", lang), icon: Gift }] : []),
    { id: "oyin", label: t("nav.ads", lang), icon: Tv },
    { id: "referal", label: t("nav.referral", lang), icon: Users },
    { id: "top", label: t("nav.top", lang), icon: Trophy },
    { id: "profil", label: t("nav.profile", lang), icon: User },
    ...(isAdmin ? [{ id: "admin", label: t("nav.admin", lang), icon: Settings }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/95 backdrop-blur-sm border-t border-border z-20">
      <div className="flex justify-around py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all ${
                isActive
                  ? "text-primary bg-primary/10 scale-105"
                  : "text-muted-foreground active:scale-95"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
