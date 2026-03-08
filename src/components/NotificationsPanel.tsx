import { useState } from "react";
import { Bell, CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { t } from "@/lib/i18n";

const NotificationsPanel = ({ onClose }: { onClose: () => void }) => {
  const { notifications, unreadCount, markAllRead, lang } = useSettings();

  return (
    <div className="py-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="text-primary" size={20} />
          <h2 className="text-lg font-bold text-foreground">{t("notif.title", lang)}</h2>
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[10px] text-primary font-medium"
            >
              {t("notif.markRead", lang)}
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg bg-muted active:scale-95 transition-transform">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 && (
          <div className="bg-card rounded-lg p-6 card-shadow text-center">
            <Bell className="mx-auto text-muted-foreground mb-2" size={32} />
            <p className="text-sm text-muted-foreground">{t("notif.empty", lang)}</p>
          </div>
        )}
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`bg-card rounded-lg p-3 card-shadow flex items-start gap-2.5 ${
              !notif.is_read ? "ring-1 ring-primary/30" : ""
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              notif.type === "warning" ? "bg-destructive/10" : "bg-primary/10"
            }`}>
              {notif.type === "warning" ? (
                <AlertTriangle size={16} className="text-destructive" />
              ) : (
                <Info size={16} className="text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-xs font-semibold text-foreground">{notif.title}</p>
                {!notif.is_read && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">{notif.message}</p>
              <p className="text-[9px] text-muted-foreground mt-1">
                {new Date(notif.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPanel;
