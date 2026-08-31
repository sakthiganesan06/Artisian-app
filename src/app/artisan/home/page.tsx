'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTranslation, getActiveLanguage, setActiveLanguage } from '@/lib/i18n/translations';
import { SUPPORTED_LANGUAGES } from '@/lib/validations';

interface Profile {
  artisanId: string;
  name: string;
  craftType: string | null;
  location: string | null;
  experience: string | null;
}

interface Product {
  id: string;
  title: string;
  sellingPrice: number;
  status: string;
  images?: Array<{ processedUrl?: string; originalUrl: string }>;
  inventory?: { currentStock: number; moq?: number };
}

export default function ArtisanHomePage() {
  const router = useRouter();
  const [language, setLanguage] = useState('en');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    const active = getActiveLanguage();
    setLanguage(active);
  }, []);

  const t = getTranslation(language);

  const handleLanguageChange = (newLang: string) => {
    setActiveLanguage(newLang);
    setLanguage(newLang);
  };

  // Real-time Notification Toast State
  const [toastNotif, setToastNotif] = useState<{ title: string; message: string; orderId?: string } | null>(null);

  // Quick Stock Update State
  const [stockEditProduct, setStockEditProduct] = useState<Product | null>(null);
  const [newStockVal, setNewStockVal] = useState<number | ''>('');
  const [stockUpdating, setStockUpdating] = useState(false);

  useEffect(() => {
    loadDashboard();
    
    // Ask for browser notification permissions if supported
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Real-time order notification polling every 6 seconds
    const interval = setInterval(async () => {
      try {
        const notifsRes = await fetch('/api/notifications');
        if (notifsRes.ok) {
          const notifData = await notifsRes.json();
          const newUnread = notifData.unreadCount || 0;

          setUnreadNotifs((prevCount) => {
            if (newUnread > prevCount && notifData.notifications?.[0]) {
              const newest = notifData.notifications[0];
              let meta: Record<string, unknown> = {};
              try { meta = newest.data ? JSON.parse(newest.data) : {}; } catch {}

              // Show Toast Banner
              setToastNotif({
                title: newest.title,
                message: newest.message,
                orderId: typeof meta.orderId === 'string' ? meta.orderId : undefined,
              });

              // Trigger System Browser Notification if allowed
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(newest.title, {
                  body: newest.message,
                  icon: '/icon-192.png',
                });
              }
            }
            return newUnread;
          });
        }
      } catch (err) {
        console.error('Notification poll error:', err);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboard = async () => {
    try {
      const [profileRes, productsRes, notifsRes] = await Promise.all([
        fetch('/api/artisan/profile'),
        fetch('/api/products'),
        fetch('/api/notifications'),
      ]);

      if (!profileRes.ok) {
        router.push('/login');
        return;
      }

      const profileData = await profileRes.json();
      setProfile(profileData.profile);
      setQrCode(profileData.qrCode);

      if (productsRes.ok) {
        const prodData = await productsRes.json();
        setProducts(prodData.products || []);
      }

      if (notifsRes.ok) {
        const notifData = await notifsRes.json();
        setUnreadNotifs(notifData.unreadCount || 0);
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/login');
  };

  const handleSaveStock = async () => {
    if (!stockEditProduct || newStockVal === '') return;
    setStockUpdating(true);

    try {
      const res = await fetch(`/api/products/${stockEditProduct.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStock: Number(newStockVal) }),
      });

      if (res.ok) {
        setStockEditProduct(null);
        await loadDashboard();
      }
    } catch (err) {
      console.error('Stock update error:', err);
    } finally {
      setStockUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="page-center">
        <div className="spinner" />
        <p className="loading-text">Loading dashboard...</p>
      </div>
    );
  }

  if (!profile) return null;

  const publishedProducts = products.filter(p => p.status === 'PUBLISHED');
  const draftProducts = products.filter(p => p.status === 'DRAFT');

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', position: 'relative' }}>
      {/* Toast Alert Popup for New Order */}
      {toastNotif && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            maxWidth: '380px',
            animation: 'slideIn 0.3s ease-out',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div className="flex-between">
            <h4 style={{ color: 'white', margin: 0, fontSize: '1.05rem' }}>{toastNotif.title}</h4>
            <button
              onClick={() => setToastNotif(null)}
              style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.8 }}
            >
              ✕
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.95 }}>{toastNotif.message}</p>
          <button
            onClick={() => router.push('/artisan/orders')}
            className="btn"
            style={{
              marginTop: '8px',
              background: 'white',
              color: '#059669',
              fontWeight: 700,
              fontSize: '0.85rem',
              padding: '6px 12px',
            }}
          >
            📦 View Order & Fulfill
          </button>
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-content">
          <Link className="navbar-brand" href="/artisan/home">🎨 Artisan</Link>
          <div className="navbar-links" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {/* Quick Language Selector */}
            <select
              className="form-input"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </select>

            <Link className="navbar-link" href="/artisan/orders">📦 {t.orders}</Link>
            <Link className="navbar-link" href="/artisan/products/new">➕ {t.addProductBtn}</Link>
            <Link className="navbar-link" href="/artisan/notifications" style={{ position: 'relative' }}>
              🔔
              {unreadNotifs > 0 && (
                <span className="notification-badge">{unreadNotifs}</span>
              )}
            </Link>
            <button className="btn btn-ghost" onClick={handleLogout} style={{ fontSize: 'var(--text-sm)' }}>
              {t.logout}
            </button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-8)' }}>
        {/* Welcome Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-8)',
          color: 'white',
          marginBottom: 'var(--space-8)',
        }}>
          <div className="flex-between flex-wrap gap-4">
            <div>
              <p style={{ opacity: 0.8, marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>{t.welcomeBack}</p>
              <h1 style={{ color: 'white', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>
                {profile.name}
              </h1>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-sm)',
                background: 'rgba(255,255,255,0.15)',
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-full)',
                display: 'inline-block',
              }}>
                {t.artisanIdBadge}: {profile.artisanId}
              </div>
              {profile.craftType && (
                <p style={{ marginTop: 'var(--space-2)', opacity: 0.85 }}>
                  {profile.craftType} {profile.location ? `• ${profile.location}` : ''}
                </p>
              )}
            </div>
            <button
              className="btn"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                backdropFilter: 'blur(10px)',
              }}
              onClick={() => setShowQR(!showQR)}
            >
              {showQR ? t.hideQRBtn : t.showQRBtn}
            </button>
          </div>

          {showQR && qrCode && (
            <div style={{
              marginTop: 'var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.25)',
              padding: 'var(--space-6)',
              borderRadius: 'var(--radius-xl)',
            }}>
              <div className="qr-container" style={{ background: 'white', padding: '16px', borderRadius: '16px', textAlign: 'center' }}>
                <img src={qrCode} alt="Artisan QR Code" width={220} height={220} className="qr-code-img" style={{ borderRadius: '8px' }} />
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-primary-dark)',
                  marginTop: 'var(--space-2)',
                }}>
                  {profile.artisanId}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
                  {t.qrScanInstruction}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)', flexWrap: 'wrap', justifyContent: 'center' }}>
                <a
                  href={qrCode}
                  download={`artisan-qr-${profile.artisanId}.png`}
                  className="btn"
                  style={{
                    background: 'white',
                    color: 'var(--color-primary-dark)',
                    fontWeight: 700,
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {t.downloadQRBtn}
                </a>
                <a
                  href={`/artisan/${profile.artisanId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.4)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {t.previewProfileBtn}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-4" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="stat-card">
            <div className="stat-value">{products.length}</div>
            <div className="stat-label">{t.totalProducts}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{publishedProducts.length}</div>
            <div className="stat-label">{t.published}</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{draftProducts.length}</div>
            <div className="stat-label">{t.drafts}</div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => router.push('/artisan/notifications')}>
            <div className="stat-value" style={{ color: unreadNotifs > 0 ? 'var(--color-danger)' : undefined }}>
              {unreadNotifs}
            </div>
            <div className="stat-label">{t.notifications}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-8)', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => router.push('/artisan/products/new')}
            style={{ flex: '1 1 200px' }}
          >
            ➕ {t.addProductBtn}
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => router.push('/artisan/orders')}
            style={{ flex: '1 1 200px' }}
          >
            📦 {t.viewOrdersBtn}
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => router.push('/artisan/notifications')}
            style={{ flex: '1 1 200px' }}
          >
            🔔 {t.notifications}
          </button>
        </div>

        {/* Stock Update Modal */}
        {stockEditProduct && (
          <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="card card-body" style={{ width: '100%', maxWidth: '420px', background: 'var(--color-surface)' }}>
              <h3>{t.updateStockModalTitle}</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                Product: <strong>{stockEditProduct.title}</strong>
              </p>
              
              <div className="form-group">
                <label className="form-label">Available In-Stock Quantity</label>
                <input
                  type="number"
                  className="form-input form-input-lg"
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Enter current stock units..."
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button className="btn btn-secondary" onClick={() => setStockEditProduct(null)}>
                  {t.cancel}
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveStock} disabled={stockUpdating}>
                  {stockUpdating ? t.loading : t.save}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products */}
        <h2 style={{ marginBottom: 'var(--space-4)' }}>{t.myProductsAndInventory}</h2>

        {products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎨</div>
            <div className="empty-state-title">{t.noProductsYet}</div>
            <div className="empty-state-text">
              {t.addFirstProductPrompt}
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => router.push('/artisan/products/new')}
            >
              {t.addFirstProductBtn}
            </button>
          </div>
        ) : (
          <div className="grid grid-3">
            {products.map(product => (
              <div key={product.id} className="product-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  height: '180px',
                  background: 'var(--color-bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                }}>
                  {product.images?.[0]?.processedUrl || product.images?.[0]?.originalUrl ? (
                    <img
                      src={product.images[0].processedUrl || product.images[0].originalUrl}
                      alt={product.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : '🎨'}
                </div>
                <div className="product-card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div className="product-card-title">{product.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
                    <div className="product-card-price">
                      ₹{(product.sellingPrice / 100).toLocaleString('en-IN')}
                    </div>
                    <span className={`badge ${
                      product.status === 'PUBLISHED' ? 'badge-success' :
                      product.status === 'OUT_OF_STOCK' ? 'badge-danger' : 'badge-neutral'
                    }`}>
                      {product.status}
                    </span>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: 'var(--space-3)' }}>
                    {product.inventory && (
                      <div className="product-card-stock" style={{
                        color: product.inventory.currentStock > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                        fontWeight: 700,
                        marginBottom: 'var(--space-2)'
                      }}>
                        Current Stock: {product.inventory.currentStock} units
                      </div>
                    )}

                    <button
                      className="btn btn-secondary btn-sm btn-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStockEditProduct(product);
                        setNewStockVal(product.inventory?.currentStock ?? 0);
                      }}
                    >
                      📦 Quick Update Stock
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
