import { useUser } from "@/contexts/UserContext";
import { getTelegramUser } from "@/lib/api";

const Header = () => {
  const { user, loading } = useUser();
  const tgUser = getTelegramUser()?.user;
  const photoUrl = tgUser?.photo_url;

  if (loading || !user) {
    return (
      <div className="flex items-center justify-between px-3 py-2 sticky top-0 z-10 bg-background">
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl bg-muted animate-pulse" />
          <div>
            <div className="w-20 h-3 bg-muted rounded animate-pulse mb-1" />
            <div className="w-16 h-2 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="w-24 h-9 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 sticky top-0 z-10 bg-background">
      <div className="flex items-center gap-2.5">
        <div className="w-11 h-11 rounded-2xl overflow-hidden card-3d">
          {photoUrl ? (
            <img src={photoUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="font-bold text-foreground text-sm">{user.name}</p>
          <p className="text-[10px] text-muted-foreground">ID: {user.id}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {/* Bonus balance - always visible */}
        <div className="flex items-center gap-1 bg-accent/20 text-accent-foreground rounded-2xl px-2.5 py-1.5">
          <span className="text-sm">🎁</span>
          <span className="font-bold text-xs">{(user.bonus_balance || 0).toLocaleString()}</span>
        </div>
        {/* Main balance */}
        <div className="flex items-center gap-1 gradient-coin text-white rounded-2xl px-3 py-1.5 btn-3d-accent">
          <span className="text-sm">🪙</span>
          <span className="font-bold text-sm drop-shadow-sm">{user.balance.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default Header;
