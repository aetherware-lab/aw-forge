import React, { useEffect, useRef, useState } from 'react';
import { IconAlertCircle, IconBell, IconCheck, IconInfo, IconX } from '@/components/Icon';
import { AppNotification, useNotifications } from '@/store/notifications';
import { useSolicitations } from '@/store/solicitations';

const KIND_ICON: Record<AppNotification['kind'], React.FC<{ size?: number }>> = {
  success: IconCheck,
  error: IconAlertCircle,
  news: IconInfo,
};

const TOAST_MS = 6000;
const MAX_TOASTS = 3;

/**
 * Bell trigger + dropdown history (mirrors UserMenu.tsx's open/outside-click/
 * Escape handling) plus a floating toast stack for the most recent unread
 * notifications. Mounted once in AppShell's topbar so it's live on every
 * authenticated screen, regardless of which one is on screen when a run
 * finishes.
 */
const NotificationCenter: React.FC = () => {
  const notifications = useNotifications((s) => s.notifications);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const add = useNotifications((s) => s.add);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // ponytail: NEWS (fixtures/news.ts) is static seed data — there's no live
  // SAM.gov feed to subscribe to yet. "New news" is simulated as "not
  // notified on this install": each item fires once, ever, via the store's
  // dedupe key, the same mechanism a real poller would use. Swap this for
  // an actual poll once news.ts is replaced by a server endpoint.
  const news = useSolicitations((s) => s.news);
  useEffect(() => {
    news.forEach((item) => {
      add({ kind: 'news', title: item.title, body: item.body }, `news:${item.id}`);
    });
    // Deliberately runs once on mount only — see the ponytail note above.
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const unread = notifications.filter((n) => !n.read);
  const toasts = unread.slice(0, MAX_TOASTS);

  return (
    <>
      <div className="notif-center" ref={rootRef}>
        <button
          type="button"
          className="notif-bell"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Notifications"
        >
          <IconBell size={16} />
          {unread.length > 0 && (
            <span className="notif-badge">{unread.length > 9 ? '9+' : unread.length}</span>
          )}
        </button>

        {open && (
          <div className="notif-panel" role="menu">
            <div className="notif-panel-head">
              <span>Notifications</span>
              {notifications.length > 0 && (
                <button type="button" className="panel-link" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="notif-empty">Nothing yet.</div>
            ) : (
              notifications.map((n) => {
                const Icon = KIND_ICON[n.kind];
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`notif-row notif-${n.kind}${n.read ? '' : ' notif-unread'}`}
                    role="menuitem"
                    onClick={() => markRead(n.id)}
                  >
                    <Icon size={14} />
                    <span className="notif-row-text">
                      <strong>{n.title}</strong>
                      <span className="notif-row-body">{n.body}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <Toast key={t.id} notification={t} onDismiss={() => markRead(t.id)} />
        ))}
      </div>
    </>
  );
};

const Toast: React.FC<{ notification: AppNotification; onDismiss: () => void }> = ({
  notification,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, TOAST_MS);
    return () => window.clearTimeout(timer);
    // Re-arms only when the toast itself changes, not on every onDismiss
    // identity change (markRead is stable from zustand, but this is the
    // same intentional-narrow-deps pattern AppShell.tsx uses).
  }, [notification.id]);

  const Icon = KIND_ICON[notification.kind];
  return (
    <div className={`toast toast-${notification.kind}`}>
      <Icon size={16} />
      <div className="toast-body">
        <div className="toast-title">{notification.title}</div>
        <div className="toast-text">{notification.body}</div>
      </div>
      <button type="button" className="toast-close" onClick={onDismiss} aria-label="Dismiss">
        <IconX size={12} />
      </button>
    </div>
  );
};

export default NotificationCenter;
