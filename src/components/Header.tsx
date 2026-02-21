import { useUser } from "@/contexts/UserContext";
import { getUserLevel, getTelegramUser } from "@/lib/api";

const Header = () => {
  const { user, loading } = useUser();
  const tgUser = getTelegramUser()?.user;
  const photoUrl = tgUser?.photo_url;

  if (loading || !user) {
    return (
      <div className="flex items-center justify-between px-3 py-2 sticky top-0 z-10 bg-background">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
          <div>
            <div className="w-20 h-3 bg-muted rounded animate-pulse mb-1" />
            <div className="w-16 h-2 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="w-20 h-8 bg-muted rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 sticky top-0 z-10 bg-background">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden">
          {photoUrl ? (
            <img src={photoUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold text-foreground text-xs">{user.name}</p>
          <p className="text-[10px] text-muted-foreground">ID: {user.id}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 bg-accent/30 border border-accent rounded-full px-2.5 py-1">
        <span className="text-sm">🪙</span>
        <span className="font-bold text-accent-foreground text-sm">{user.balance.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default Header;
