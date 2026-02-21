import { useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { fetchTopUsers, getUserLevel, type DbUser } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";

const UserAvatar = ({ user, size = "md" }: { user: DbUser; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = { sm: "w-8 h-8 text-xs", md: "w-16 h-16 text-lg", lg: "w-20 h-20 text-xl" };
  const cls = sizeClasses[size];
  const lvl = getUserLevel(user.referral_count);

  return (
    <div className={`${cls} rounded-full bg-muted overflow-hidden`}>
      {user.photo_url ? (
        <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">{lvl.emoji}</div>
      )}
    </div>
  );
};

const TopPage = () => {
  const { user } = useUser();
  const [allUsers, setAllUsers] = useState<DbUser[]>([]);

  const loadUsers = () => fetchTopUsers(30).then(setAllUsers);

  useEffect(() => {
    loadUsers();
    const channel = supabase
      .channel("top-users-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => { loadUsers(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const top3 = allUsers.slice(0, 3);
  const rest = allUsers.slice(3);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="py-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Trophy className="text-primary" size={22} />
        <h1 className="text-lg font-bold text-foreground">Liderboard</h1>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Top 30 foydalanuvchi · Real vaqtda</p>

      <div className="flex items-end justify-center gap-3 mb-5">
        {[1, 0, 2].map((idx) => {
          const u = top3[idx];
          if (!u) return null;
          const isFirst = idx === 0;
          return (
            <div key={u.id} className={`flex flex-col items-center ${isFirst ? "-mt-3" : ""}`}>
              <div className={`${isFirst ? "text-2xl" : "text-xl"} mb-0.5`}>{isFirst ? "👑" : medals[idx]}</div>
              <div className={`${isFirst ? "border-accent" : "border-muted"} border-2 rounded-full`}>
                <UserAvatar user={u} size={isFirst ? "lg" : "md"} />
              </div>
              <p className="text-[10px] font-semibold text-foreground truncate max-w-[70px]">{u.name}</p>
              <p className="text-[9px] text-muted-foreground">ID: {u.id}</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <span className="text-[10px]">🪙</span>
                <span className="text-[10px] font-bold text-accent-foreground">{u.balance.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        {rest.map((u, i) => (
          <div key={u.id} className={`bg-card rounded-lg p-2.5 card-shadow flex items-center gap-2.5 ${u.id === user?.id ? "ring-1 ring-primary" : ""}`}>
            <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 4}</span>
            <UserAvatar user={u} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-xs truncate">{u.name}</p>
              <p className="text-[10px] text-muted-foreground">ID: {u.id}</p>
            </div>
            <div className="flex items-center gap-0.5">
              <span className="text-xs">🪙</span>
              <span className="text-xs font-bold text-accent-foreground">{u.balance.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopPage;
