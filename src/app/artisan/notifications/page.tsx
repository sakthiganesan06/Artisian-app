'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTranslation, getActiveLanguage } from '@/lib/i18n/translations';

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
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    setLanguage(getActiveLanguage());
    fetchNotifications();
  }, []);

  const t = getTranslation(language);

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
        <p className="loading-text">{t.loading}</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="navbar-content">
          <Link className="navbar-brand" href="/artisan/home">🎨 {t.appTitle}</Link>
          <div className="navbar-links">
            <Link className="navbar-link" href="/artisan/home">{t.dashboard}</Link>
            <Link className="navbar-link" href="/artisan/orders">{t.orders}</Link>
            <Link className="navbar-link active" href="/artisan/notifications">{t.notifications}</Link>
            <Link className="navbar-link" href="/artisan/products/new">{t.addProductBtn}</Link>
          </div>
        </div>
      </nav>

      <div className="container container-md" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <h1 style={{ margin: 0 }}>{t.notificationsTitle}</h1>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/artisan/home')}>
            ← {t.back}
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <div className="empty-state-title">{t.noNotifications}</div>
            <div className="empty-state-text">{t.noNotificationsSubtext}</div>
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
                  cursor: 'pointer',
                }}
                onClick={() => markAsRead(n.id)}
              >
                <div className="flex-between">
                  <h4 style={{ color: n.isRead ? 'var(--color-text)' : 'var(--color-primary-dark)' }}>{n.title}</h4>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {new Date(n.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ marginTop: 'var(--space-1)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

