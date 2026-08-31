'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  // Quick Stock Update State
  const [stockEditProduct, setStockEditProduct] = useState<Product | null>(null);
  const [newStockVal, setNewStockVal] = useState<number | ''>('');
  const [stockUpdating, setStockUpdating] = useState(false);

  useEffect(() => {
    loadDashboard();
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
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-content">
          <a className="navbar-brand" href="/artisan/home">🎨 Artisan</a>
          <div className="navbar-links">
            <a className="navbar-link" href="/marketplace">🛍️ Marketplace</a>
            <a className="navbar-link" href="/artisan/notifications" style={{ position: 'relative' }}>
              🔔
              {unreadNotifs > 0 && (
                <span className="notification-badge">{unreadNotifs}</span>
              )}
            </a>
            <button className="btn btn-ghost" onClick={handleLogout} style={{ fontSize: 'var(--text-sm)' }}>
              Logout
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
              <p style={{ opacity: 0.8, marginBottom: 'var(--space-1)', fontSize: 'var(--text-sm)' }}>Welcome back,</p>
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
                {profile.artisanId}
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
              📱 {showQR ? 'Hide' : 'Show'} QR Code
            </button>
          </div>

          {showQR && qrCode && (
            <div style={{
              marginTop: 'var(--space-6)',
              display: 'flex',
              justifyContent: 'center',
            }}>
              <div className="qr-container">
                <img src={qrCode} alt="Artisan QR Code" width={200} height={200} className="qr-code-img" />
                <span className="qr-artisan-id">{profile.artisanId}</span>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  Share this QR for your public profile
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-4" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="stat-card">
            <div className="stat-value">{products.length}</div>
            <div className="stat-label">Total Products</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{publishedProducts.length}</div>
            <div className="stat-label">Published</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{draftProducts.length}</div>
            <div className="stat-label">Drafts</div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => router.push('/artisan/notifications')}>
            <div className="stat-value" style={{ color: unreadNotifs > 0 ? 'var(--color-danger)' : undefined }}>
              {unreadNotifs}
            </div>
            <div className="stat-label">Notifications</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-8)', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => router.push('/artisan/products/new')}
            style={{ flex: '1 1 200px' }}
          >
            ➕ Add Product
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => router.push('/artisan/orders')}
            style={{ flex: '1 1 200px' }}
          >
            📦 View Orders
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => router.push('/marketplace')}
            style={{ flex: '1 1 200px' }}
          >
            🛍️ Marketplace
          </button>
        </div>

        {/* Stock Update Modal */}
        {stockEditProduct && (
          <div className="loading-overlay" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="card card-body" style={{ width: '100%', maxWidth: '420px', background: 'var(--color-surface)' }}>
              <h3>📦 Update Stock Availability</h3>
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
                  Cancel
                </button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveStock} disabled={stockUpdating}>
                  {stockUpdating ? 'Saving Stock...' : 'Save Stock Quantity'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products */}
        <h2 style={{ marginBottom: 'var(--space-4)' }}>My Products & Inventory</h2>

        {products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎨</div>
            <div className="empty-state-title">No products yet</div>
            <div className="empty-state-text">
              Add your first product using voice and photos
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => router.push('/artisan/products/new')}
            >
              ➕ Add Your First Product
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
