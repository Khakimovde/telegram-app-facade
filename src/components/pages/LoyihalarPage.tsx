import { useState, useEffect, useCallback } from "react";
import { Sparkles, Clock, Star, ExternalLink, Loader2, CheckCircle2, Rocket, Gamepad2, Brain, Trophy, Gift, Palette, Music, BookOpen, Camera, ShoppingBag, Heart, Zap, Globe, Cpu, Film, Lightbulb, Target, Compass, Gem, Flame, Award, Crown, Dice1 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { useSettings } from "@/contexts/SettingsContext";
import { t } from "@/lib/i18n";
import { watchAd, getLoyihaAdsCount } from "@/lib/api";

const AD_URL_1 = "https://crn77.com/4/10640772";
const AD_URL_2 = "https://omg10.com/4/10684278";
let lastLinkIdx = 0;

interface Project {
  id: number;
  emoji: string;
  icon: typeof Sparkles;
  name: string;
  desc: string;
  color: string;
}

const PROJECTS: Project[] = [
  { id: 1, emoji: "🎰", icon: Dice1, name: "Omad g'ildiragi", desc: "Omadingizni sinab ko'ring!", color: "from-red-500/20 to-orange-500/20" },
  { id: 2, emoji: "🧩", icon: Brain, name: "So'z jumboq", desc: "Aqlingizni sinang", color: "from-blue-500/20 to-cyan-500/20" },
  { id: 3, emoji: "🏆", icon: Trophy, name: "Viktorina", desc: "Bilimingizni tekshiring", color: "from-yellow-500/20 to-amber-500/20" },
  { id: 4, emoji: "🎯", icon: Target, name: "Nishonga ur", desc: "Aniqlikni tekshiring", color: "from-green-500/20 to-emerald-500/20" },
  { id: 5, emoji: "🎮", icon: Gamepad2, name: "Mini o'yin", desc: "Qiziqarli mini o'yin", color: "from-purple-500/20 to-violet-500/20" },
  { id: 6, emoji: "📋", icon: BookOpen, name: "So'rovnoma", desc: "Fikringiz muhim!", color: "from-teal-500/20 to-cyan-500/20" },
  { id: 7, emoji: "📸", icon: Camera, name: "Foto challenge", desc: "Kunlik suratga tushish", color: "from-pink-500/20 to-rose-500/20" },
  { id: 8, emoji: "🎬", icon: Film, name: "Video ko'ring", desc: "Qisqa videolar", color: "from-indigo-500/20 to-blue-500/20" },
  { id: 9, emoji: "🛒", icon: ShoppingBag, name: "Do'kon sinovi", desc: "Yangi mahsulotlar", color: "from-orange-500/20 to-red-500/20" },
  { id: 10, emoji: "❤️", icon: Heart, name: "Sog'liq testi", desc: "Sog'lig'ingizni bilib oling", color: "from-rose-500/20 to-pink-500/20" },
  { id: 11, emoji: "⚡", icon: Zap, name: "Tezkor o'yin", desc: "Reaktsiyangizni sinang", color: "from-yellow-500/20 to-orange-500/20" },
  { id: 12, emoji: "🌍", icon: Globe, name: "Dunyo yangiliklari", desc: "So'nggi voqealar", color: "from-blue-500/20 to-teal-500/20" },
  { id: 13, emoji: "💻", icon: Cpu, name: "Texnologiya", desc: "Yangi ixtirolar", color: "from-slate-500/20 to-gray-500/20" },
  { id: 14, emoji: "💡", icon: Lightbulb, name: "Ijodiy g'oya", desc: "Ilhom oling", color: "from-amber-500/20 to-yellow-500/20" },
  { id: 15, emoji: "🧭", icon: Compass, name: "Sayohat", desc: "Go'zal joylar", color: "from-emerald-500/20 to-green-500/20" },
  { id: 16, emoji: "💎", icon: Gem, name: "Premium sinov", desc: "Eksklyuziv kontent", color: "from-cyan-500/20 to-blue-500/20" },
  { id: 17, emoji: "🔥", icon: Flame, name: "Trend loyiha", desc: "Eng mashhurlar", color: "from-red-500/20 to-orange-500/20" },
  { id: 18, emoji: "🎖", icon: Award, name: "Sertifikat", desc: "Bilim olish", color: "from-violet-500/20 to-purple-500/20" },
  { id: 19, emoji: "👑", icon: Crown, name: "VIP kirish", desc: "Maxsus imkoniyat", color: "from-yellow-500/20 to-amber-500/20" },
  { id: 20, emoji: "🎨", icon: Palette, name: "San'at galereyasi", desc: "Chiroyli asarlar", color: "from-pink-500/20 to-purple-500/20" },
  { id: 21, emoji: "🎵", icon: Music, name: "Musiqa testi", desc: "Qo'shiq toping", color: "from-indigo-500/20 to-violet-500/20" },
  { id: 22, emoji: "🚀", icon: Rocket, name: "Kosmik sayohat", desc: "Yulduzlar orasida", color: "from-blue-500/20 to-indigo-500/20" },
  { id: 23, emoji: "⭐", icon: Star, name: "Yulduz yig'ish", desc: "Yulduzlarni yig'ing", color: "from-yellow-500/20 to-amber-500/20" },
  { id: 24, emoji: "🏃", icon: Zap, name: "Sport challenge", desc: "Harakatda bo'ling", color: "from-green-500/20 to-teal-500/20" },
  { id: 25, emoji: "📖", icon: BookOpen, name: "Hikoya o'qing", desc: "Qiziqarli hikoyalar", color: "from-amber-500/20 to-orange-500/20" },
  { id: 26, emoji: "🤖", icon: Cpu, name: "AI sinov", desc: "Sun'iy intellekt", color: "from-cyan-500/20 to-blue-500/20" },
  { id: 27, emoji: "🎁", icon: Gift, name: "Maxfiy quti", desc: "Nimalar bor?", color: "from-rose-500/20 to-red-500/20" },
  { id: 28, emoji: "🧮", icon: Brain, name: "Matematik", desc: "Tezkor hisob", color: "from-teal-500/20 to-emerald-500/20" },
  { id: 29, emoji: "🏁", icon: Trophy, name: "Marafon", desc: "Eng tez bo'ling", color: "from-purple-500/20 to-violet-500/20" },
  { id: 30, emoji: "🎲", icon: Dice1, name: "Zar tashlash", desc: "Omad o'yini", color: "from-orange-500/20 to-red-500/20" },
];

const LoyihalarPage = () => {
  const { user } = useUser();
  const { lang } = useSettings();
  const [adsWatched, setAdsWatched] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });
  const [activeProject, setActiveProject] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const MAX_ADS = 10;
  const REWARD = 30;

  const loadData = useCallback(async () => {
    if (!user) return;
    const data = await getLoyihaAdsCount(user.id);
    setAdsWatched(data.current);
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

  const openAd = () => {
    const url = lastLinkIdx === 0 ? AD_URL_1 : AD_URL_2;
    lastLinkIdx = lastLinkIdx === 0 ? 1 : 0;
    try {
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(url);
      } else {
        window.open(url, "_blank");
      }
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleProjectClick = async (projectId: number) => {
    if (adsWatched >= MAX_ADS || !user || phase !== "idle") return;
    setActiveProject(projectId);
    setPhase("loading");

    // Try RichAds first, fallback to direct link
    let richShown = false;
    try {
      if (window.TelegramAdsController?.triggerInterstitialBanner) {
        await window.TelegramAdsController.triggerInterstitialBanner();
        richShown = true;
      }
    } catch {}
    if (!richShown) openAd();

    // 7 second wait
    setTimeout(async () => {
      try {
        const result = await watchAd(user.id, "loyiha");
        if (result.success) {
          setAdsWatched(result.current);
          if (result.current >= MAX_ADS) {
            toast.success(`🎉 ${REWARD} tanga topildingiz!`);
          } else {
            toast.info(`✅ ${result.current}/${MAX_ADS} loyiha ko'rildi`);
          }
        }
      } catch {
        toast.error("Xatolik yuz berdi");
      }
      setPhase("done");
      setTimeout(() => { setPhase("idle"); setActiveProject(null); }, 800);
    }, 7000);
  };

  const fmt = (m: number, s: number) => `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const completed = adsWatched >= MAX_ADS;

  // Shuffle projects based on current date so it changes daily
  const today = new Date().toISOString().split("T")[0];
  const seed = today.split("-").reduce((a, b) => a + parseInt(b), 0);
  const shuffled = [...PROJECTS].sort((a, b) => {
    const ha = ((a.id * seed) % 97);
    const hb = ((b.id * seed) % 97);
    return ha - hb;
  });

  return (
    <div className="py-3 space-y-3">
      {/* Header */}
      <div className="text-center mb-1">
        <div className="inline-flex items-center gap-1.5 mb-0.5">
          <Sparkles className="text-primary" size={22} />
          <h1 className="text-lg font-bold text-foreground">{t("projects.title", lang)}</h1>
        </div>
        <p className="text-xs text-muted-foreground">{t("projects.subtitle", lang)}</p>
      </div>

      {/* Stats bar */}
      <div className="bg-card rounded-2xl p-3 card-3d">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-foreground">{adsWatched}/{MAX_ADS}</div>
            <span className="text-xs text-muted-foreground">{t("projects.explored", lang)}</span>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5">
            <Clock size={12} className="text-muted-foreground" />
            <span className="text-xs font-bold text-foreground">{fmt(timeLeft.minutes, timeLeft.seconds)}</span>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className="gradient-primary h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${(adsWatched / MAX_ADS) * 100}%`, boxShadow: "0 2px 4px hsl(var(--primary) / 0.3)" }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted-foreground">{t("projects.reward", lang)}</span>
          <span className="text-xs font-bold text-primary">🪙 {REWARD} tanga</span>
        </div>
      </div>

      {completed && (
        <div className="bg-success/10 rounded-2xl p-3 card-3d text-center">
          <CheckCircle2 className="mx-auto text-success mb-1" size={24} />
          <p className="text-sm font-bold text-success">{t("projects.allDone", lang)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("projects.nextIn", lang)} <span className="font-bold text-primary">{fmt(timeLeft.minutes, timeLeft.seconds)}</span>
          </p>
        </div>
      )}

      {/* Project grid */}
      <div className="grid grid-cols-2 gap-2">
        {shuffled.map((project) => {
          const Icon = project.icon;
          const isActive = activeProject === project.id;
          const isExplored = project.id <= adsWatched; // visual indicator

          return (
            <button
              key={project.id}
              onClick={() => handleProjectClick(project.id)}
              disabled={completed || phase !== "idle"}
              className={`relative bg-gradient-to-br ${project.color} bg-card rounded-2xl p-3 text-left transition-all duration-200 border border-border/50 ${
                completed ? "opacity-50" : "active:scale-95 hover:shadow-md"
              } ${isActive ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <span className="text-xl">{project.emoji}</span>
                {isActive && phase === "loading" ? (
                  <Loader2 size={14} className="text-primary animate-spin" />
                ) : isActive && phase === "done" ? (
                  <CheckCircle2 size={14} className="text-success" />
                ) : (
                  <ExternalLink size={12} className="text-muted-foreground" />
                )}
              </div>
              <p className="text-xs font-semibold text-foreground leading-tight">{project.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{project.desc}</p>
              <div className="mt-1.5 flex items-center gap-1">
                <span className="text-[10px]">🪙</span>
                <span className="text-[10px] font-bold text-primary">+3</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Rules */}
      <div className="bg-card rounded-2xl p-3 card-3d">
        <h3 className="text-xs font-semibold text-foreground mb-2">📋 {t("projects.rules", lang)}</h3>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          <li>• {t("projects.rule1", lang)}</li>
          <li>• {t("projects.rule2", lang)}</li>
          <li>• {t("projects.rule3", lang)}</li>
          <li>• {t("projects.rule4", lang)}</li>
        </ul>
      </div>
    </div>
  );
};

export default LoyihalarPage;
