import { useState } from "react";
import { Bell, CheckCircle2, AlertTriangle, Info, X, Trash2 } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { t } from "@/lib/i18n";

const NotificationsPanel = ({ onClose }: { onClose: () => void }) => {
  const { notifications, unreadCount, markAllRead, deleteNotification, clearReadNotifications, lang } = useSettings();
  const [activeTab, setActiveTab] = useState<"unread" | "read">("unread");

  const unreadNotifs = notifications.filter(n => !n.is_read);
  const readNotifs = notifications.filter(n => n.is_read);
  const displayList = activeTab === "unread" ? unreadNotifs : readNotifs;

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
        <button onClick={onClose} className="p-1 rounded-lg bg-muted active:scale-95 transition-transform">
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("unread")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === "unread" ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          Yangi ({unreadNotifs.length})
        </button>
        <button
          onClick={() => setActiveTab("read")}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
            activeTab === "read" ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          O'qilgan ({readNotifs.length})
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {activeTab === "unread" && unreadNotifs.length > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-[10px] text-primary font-medium px-2 py-1 rounded-lg bg-primary/10 active:scale-95 transition-transform"
          >
            <CheckCircle2 size={12} /> Barchasini o'qilgan
          </button>
        )}
        {activeTab === "read" && readNotifs.length > 0 && (
          <button
            onClick={clearReadNotifications}
            className="flex items-center gap-1 text-[10px] text-destructive font-medium px-2 py-1 rounded-lg bg-destructive/10 active:scale-95 transition-transform"
          >
            <Trash2 size={12} /> O'qilganlarni tozalash
          </button>
        )}
      </div>

      <div className="space-y-2">
        {displayList.length === 0 && (
          <div className="bg-card rounded-lg p-6 card-shadow text-center">
            <Bell className="mx-auto text-muted-foreground mb-2" size={32} />
            <p className="text-sm text-muted-foreground">
              {activeTab === "unread" ? "Yangi bildirishnomalar yo'q" : "O'qilgan bildirishnomalar yo'q"}
            </p>
          </div>
        )}
        {displayList.map((notif) => (
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
            <button
              onClick={() => deleteNotification(notif.id)}
              className="p-1 rounded-lg hover:bg-destructive/10 active:scale-95 transition-all shrink-0"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPanel;
