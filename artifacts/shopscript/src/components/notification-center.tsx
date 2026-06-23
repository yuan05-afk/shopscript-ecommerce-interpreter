import { useEffect } from "react";
import "../notifications.css";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
}

function NotificationItem({ notice, onDismiss }: { notice: AppNotification; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(notice.id), notice.type === "error" ? 6500 : 4500);
    return () => window.clearTimeout(timer);
  }, [notice.id, notice.type, onDismiss]);

  const symbol = notice.type === "success" ? "✓" : notice.type === "error" ? "!" : notice.type === "warning" ? "!" : "i";

  return (
    <div className={`app-notification ${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
      <span className="notification-symbol" aria-hidden="true">{symbol}</span>
      <div className="notification-copy"><strong>{notice.title}</strong><p>{notice.message}</p></div>
      <button type="button" onClick={() => onDismiss(notice.id)} aria-label="Dismiss notification">×</button>
      <span className="notification-timer" aria-hidden="true" />
    </div>
  );
}

export function NotificationCenter({ notices, onDismiss }: { notices: AppNotification[]; onDismiss: (id: number) => void }) {
  return (
    <aside className="notification-center" aria-label="Application notifications" aria-live="polite">
      {notices.map(notice => <NotificationItem key={notice.id} notice={notice} onDismiss={onDismiss} />)}
    </aside>
  );
}
