import { useState } from "react";
import { Gift } from "lucide-react";
import { toast } from "sonner";

const PromoPage = () => {
  const [code, setCode] = useState("");

  const activate = () => {
    if (!code.trim()) {
      toast.error("Promo kodni kiriting!");
      return;
    }
    if (code.toUpperCase() === "BONUS100") {
      toast.success("🎉 Promo kod qabul qilindi! +100 tanga");
    } else {
      toast.error("❌ Noto'g'ri promo kod");
    }
    setCode("");
  };

  return (
    <div className="py-3">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-1.5 mb-0.5">
          <Gift className="text-primary" size={22} />
          <h1 className="text-lg font-bold text-foreground">Promo</h1>
        </div>
        <p className="text-xs text-muted-foreground">Promo kodlarni kiriting va sovg'alar oling</p>
      </div>

      <div className="bg-card rounded-lg p-4 card-shadow">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Promo kodni kiriting"
          className="w-full bg-input rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 mb-3"
          onKeyDown={(e) => e.key === "Enter" && activate()}
        />
        <button
          onClick={activate}
          className="w-full gradient-primary text-primary-foreground font-semibold py-2.5 rounded-lg active:scale-[0.98] transition-transform text-sm"
        >
          Faollashtirish
        </button>
      </div>
    </div>
  );
};

export default PromoPage;
