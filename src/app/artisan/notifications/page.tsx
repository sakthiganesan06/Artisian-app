'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      } else if (res.status === 401) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  if (loading) {
    return (
      <div className="page-center">
        <div className="spinner" />
        <p className="loading-text">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="navbar-content">
          <a className="navbar-brand" href="/artisan/home">🎨 Artisan Portal</a>
          <div className="navbar-links">
            <a className="navbar-link" href="/artisan/home">Dashboard</a>
            <a className="navbar-link" href="/artisan/orders">Orders</a>
          </div>
        </div>
      </nav>

      <div className="container container-md" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
        <h1 style={{ marginBottom: 'var(--space-6)' }}>Notifications</h1>

        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">No notifications</div>
            <div className="empty-state-text">Notifications about orders and account events will appear here</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                className="card card-body"
                style={{
                  background: n.isRead ? 'var(--color-bg-card)' : 'var(--color-primary-50)',
                  borderColor: n.isRead ? 'var(--color-border-light)' : 'var(--color-primary-200)',
                }}
                onClick={() => markAsRead(n.id)}
              >
                <div className="flex-between">
                  <h4 style={{ color: n.isRead ? 'var(--color-text)' : 'var(--color-primary-dark)' }}>{n.title}</h4>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {new Date(n.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ marginTop: 'var(--space-1)', color: 'var(--color-text-secondary)' }}>{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
