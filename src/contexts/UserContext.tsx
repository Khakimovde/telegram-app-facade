import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  type DbUser,
  authenticateUser,
  fetchCurrentUser,
  getTelegramUser,
  getUserLevel,
} from "@/lib/api";

interface UserContextType {
  user: DbUser | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  error: null,
  isAdmin: false,
  refreshUser: async () => {},
});

export function useUser() {
  return useContext(UserContext);
}

// Dev mode fallback user ID
const DEV_USER_ID = "5326022510";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const userId = user?.id || DEV_USER_ID;
    const freshUser = await fetchCurrentUser(userId);
    if (freshUser) setUser(freshUser);
  }, [user?.id]);

  // Auto-refresh balance every 5 seconds
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(async () => {
      const freshUser = await fetchCurrentUser(user.id);
      if (freshUser) setUser(freshUser);
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      try {
        const tg = getTelegramUser();

        if (tg?.initData && tg.user) {
          const referrerId = tg.startParam?.startsWith("ref_")
            ? tg.startParam.replace("ref_", "")
            : undefined;

          const dbUser = await authenticateUser(tg.initData, referrerId);
          setUser(dbUser);

          window.Telegram?.WebApp.ready();
          window.Telegram?.WebApp.expand();
        } else {
          console.log("Dev mode: no Telegram WebApp detected");
          const devUser = await fetchCurrentUser(DEV_USER_ID);
          if (devUser) {
            setUser(devUser);
          } else {
            setError("Telegram WebApp ichida oching yoki dev user yarating");
          }
        }
      } catch (err) {
        console.error("Auth error:", err);
        setError(err instanceof Error ? err.message : "Authentication xatolik");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        error,
        isAdmin: user?.is_admin || false,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
