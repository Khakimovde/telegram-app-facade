import { useState, useCallback } from "react";
import { Gift, Tv } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import AdWatchDialog from "@/components/AdWatchDialog";
import { watchBonusAd } from "@/lib/api";

const BonusDayPage = () => {
  const { user, refreshUser } = useUser();
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [totalWatched, setTotalWatched] = useState(0);

  const handleWatchAd = useCallback(async () => {
    if (!user) return;
    try {
      const result = await watchBonusAd(user.id);
      if (result.success) {
        setTotalWatched((p) => p + 1);
        toast.success("🎁 +2 Bonus tanga qo'shildi!");
        await refreshUser();
      } else {
        toast.error(result.error || "Xatolik yuz berdi");
      }
    } catch {
      toast.error("Xatolik yuz berdi");
    }
  }, [user, refreshUser]);

  return (
    <div className="py-3 space-y-3">
      <div className="text-center mb-2">
        <div className="inline-flex items-center gap-1.5 mb-0.5">
          <Gift className="text-accent-foreground" size={24} />
          <h1 className="text-lg font-bold text-foreground">Bonus Day</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Cheksiz reklama ko'ring va bonus tanga yig'ing!
        </p>
      </div>

      {/* Bonus balance card */}
      <div className="bg-card rounded-2xl p-5 card-3d text-center">
        <p className="text-xs text-muted-foreground mb-1">Bonus balansingiz</p>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-2xl">🎁</span>
          <span className="text-3xl font-bold text-accent-foreground">
            {(user?.bonus_balance || 0).toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">bonus tanga</span>
        </div>

        <div className="bg-accent/10 rounded-2xl p-3 mb-4 card-3d">
          <p className="text-xs text-muted-foreground mb-0.5">Har bir reklama uchun</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-lg">🎁</span>
            <span className="text-lg font-bold text-accent-foreground">+2 Bonus Tanga</span>
          </div>
        </div>

        <button
          onClick={() => setAdDialogOpen(true)}
          className="w-full gradient-primary text-primary-foreground font-bold py-3.5 rounded-2xl btn-3d text-sm flex items-center justify-center gap-2"
        >
          <Tv size={18} />
          Reklama ko'rish
        </button>

        {totalWatched > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Bugun {totalWatched} ta reklama ko'rdingiz
          </p>
        )}
      </div>

      {/* Motivation */}
      <div className="bg-card rounded-2xl p-3 card-3d">
        <h3 className="text-xs font-semibold text-foreground mb-2">💪 Ko'proq ishlang!</h3>
        <ul className="space-y-1 text-[11px] text-muted-foreground">
          <li>• Har bir reklama uchun 2 bonus tanga beriladi</li>
          <li>• Cheksiz reklama ko'rishingiz mumkin</li>
          <li>• Qancha ko'p ko'rsangiz, shuncha ko'p yig'asiz</li>
          <li>• Bonus tangalaringizdan unumli foydalaning! 🚀</li>
        </ul>
      </div>

      <AdWatchDialog
        open={adDialogOpen}
        onOpenChange={setAdDialogOpen}
        onWatch={handleWatchAd}
        adsWatched={0}
        maxAds={999}
        reward="+2 Bonus Tanga"
        unlimited
      />
    </div>
  );
};

export default BonusDayPage;
