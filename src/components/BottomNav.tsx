import { ListChecks, Trophy, Users, Swords, User, Settings } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "vazifalar", label: "Vazifalar", icon: ListChecks },
  { id: "oyin", label: "O'yin", icon: Swords },
  { id: "referal", label: "Referal", icon: Users },
  { id: "top", label: "Top", icon: Trophy },
  { id: "profil", label: "Profil", icon: User },
  { id: "admin", label: "Admin", icon: Settings, adminOnly: true },
];

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const { isAdmin } = useUser();

  const visibleTabs = tabs.filter((t) => !("adminOnly" in t && t.adminOnly) || isAdmin);

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border z-20">
      <div className="flex justify-around py-2">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
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
