'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers';
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@/lib/notifications-api';
import type { NotificationResponse } from '@/lib/notifications-api';

export default function NotificationsPage() {
  const { isInitialized, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setActionError(null);
    try {
      const [list, unread] = await Promise.all([
        listNotifications({ limit: 100 }),
        getUnreadCount(),
      ]);
      setNotifications(list.items);
      setUnreadCount(unread.unread_count);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isInitialized, isAuthenticated, load]);

  const handleMarkRead = async (notification: NotificationResponse) => {
    setActionError(null);
    try {
      const updated = await markNotificationRead(notification.id);
      setNotifications((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    setActionError(null);
    setIsMarkingAllRead(true);
    try {
      await markAllNotificationsRead();
      setNotifications((items) => items.map((item) => ({ ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to mark all notifications as read.');
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleDelete = async (notification: NotificationResponse) => {
    setActionError(null);
    try {
      await deleteNotification(notification.id);
      setNotifications((items) => items.filter((item) => item.id !== notification.id));
      setUnreadCount((count) => (notification.is_read ? count : Math.max(0, count - 1)));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Failed to delete notification.');
    }
  };

  if (!isInitialized || isLoading) {
    return (
      <main className="lab-loading-page">
        <span className="lab-loading-mark">AF</span>
        <div>
          <p>Executive OS</p>
          <strong>Loading notifications</strong>
          <i />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="lab-error-page">
        <section>
          <p>Executive OS</p>
          <h1>Notifications unavailable</h1>
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>Retry</button>
        </section>
      </main>
    );
  }

  return (
    <main className="portfolio-lab">
      <aside className="lab-sidebar">
        <Link className="lab-mark" href="/">
          <i>AF</i>
          <span>ARIMA<br />EXECUTIVE OS</span>
        </Link>
        <div className="lab-nav-label">Workspace</div>
        <nav>
          <Link href="/dashboard"><i>01</i>Dashboard</Link>
          <Link href="/projects"><i>02</i>Projects</Link>
          <Link href="/tasks"><i>03</i>Tasks</Link>
          <Link href="/activity"><i>04</i>Activity</Link>
          <Link className="active" href="/notifications"><i>05</i>Notifications</Link>
          <Link href="/executive"><i>06</i>Executive mode</Link>
          <Link href="/growth-studio"><i>07</i>Growth studio</Link>
        </nav>
      </aside>

      <section className="lab-content">
        <header className="lab-topbar">
          <div><span>Executive OS</span><b>/ notifications</b></div>
          <div><i />Live backend data</div>
        </header>

        <div className="lab-hero">
          <div>
            <p className="lab-eyebrow">Workspace</p>
            <h1>Notifications</h1>
            <p>{unreadCount} unread notification{unreadCount === 1 ? '' : 's'}.</p>
          </div>
          <div>
            <button type="button" onClick={handleMarkAllRead} disabled={isMarkingAllRead || unreadCount === 0}>
              {isMarkingAllRead ? 'Updating...' : 'Mark all read'}
            </button>
            <button type="button" onClick={() => void load()}>Refresh</button>
          </div>
        </div>

        {actionError && <p className="lab-error-text">{actionError}</p>}

        <section className="lab-panel">
          <p className="lab-eyebrow">Inbox</p>
          <h2>All notifications</h2>
          {notifications.length === 0 ? (
            <p className="lab-muted">No notifications found.</p>
          ) : (
            <ul className="holding-strip">
              {notifications.map((notification) => (
                <li key={notification.id} className={notification.is_read ? undefined : 'unread'}>
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <small>{new Date(notification.created_at).toLocaleString()}</small>
                  </div>
                  <div>
                    {!notification.is_read && (
                      <button type="button" onClick={() => handleMarkRead(notification)}>Mark read</button>
                    )}
                    <button type="button" onClick={() => handleDelete(notification)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="lab-footer">Arima Executive OS · Notifications are scoped to your permitted access.</footer>
      </section>
    </main>
  );
}
