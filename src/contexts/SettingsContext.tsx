import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export type Theme = "light" | "dark";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface SettingsContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  lang: "uz",
  setLang: () => {},
  theme: "light",
  setTheme: () => {},
  notifications: [],
  unreadCount: 0,
  markAllRead: async () => {},
  refreshNotifications: async () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();

  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("app_lang");
    return (saved as Lang) || "uz";
  });

  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("app_theme");
    return (saved as Theme) || "light";
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("app_lang", l);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("app_theme", t);
  }, []);

  // Apply theme class to html element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Load notifications
  const refreshNotifications = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data || []) as Notification[]);
  }, [user?.id]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Realtime notifications
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("user-notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        refreshNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [user?.id, notifications]);

  return (
    <SettingsContext.Provider value={{ lang, setLang, theme, setTheme, notifications, unreadCount, markAllRead, refreshNotifications }}>
      {children}
    </SettingsContext.Provider>
  );
}
