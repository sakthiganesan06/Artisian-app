'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTranslation, getActiveLanguage } from '@/lib/i18n/translations';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: {
    title: string;
    category: string | null;
  };
}

interface Order {
  id: string;
  orderId: string;
  orderType: 'RETAIL' | 'B2B';
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
  deliveryEstimate?: {
    formattedRange?: string;
    estimatedStart: string;
    estimatedEnd: string;
  };
  buyerProfile?: {
    fullName: string;
    phone: string;
    address: string;
  };
  b2bProfile?: {
    businessName: string;
    gstNumber: string;
    contactPhone: string;
    address: string;
  };
}

export default function ArtisanOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    setLanguage(getActiveLanguage());
    fetchOrders();
  }, []);

  const t = getTranslation(language);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) {
        router.push('/login');
        return;
      }
      const sessionData = await sessionRes.json();
      if (!sessionData.user?.id) return;

      const res = await fetch(`/api/orders?artisanUserId=${sessionData.user.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
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
            <Link className="navbar-link active" href="/artisan/orders">{t.orders}</Link>
            <Link className="navbar-link" href="/artisan/notifications">{t.notifications}</Link>
            <Link className="navbar-link" href="/artisan/products/new">{t.addProductBtn}</Link>
          </div>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <h1 style={{ margin: 0 }}>{t.receivedOrdersTitle}</h1>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/artisan/home')}>
            ← {t.back}
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-title">{t.noOrdersReceived}</div>
            <div className="empty-state-text">{t.noOrdersSubtext}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {orders.map((order) => (
              <div key={order.id} className="card card-body">
                <div className="flex-between flex-wrap gap-2" style={{ borderBottom: '1px solid var(--color-border-light)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <span className="badge badge-info" style={{ marginRight: 'var(--space-2)' }}>
                      {order.orderType}
                    </span>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)' }}>
                      {order.orderId}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span className={`badge ${order.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`}>
                      {order.status}
                    </span>
                    <div style={{ fontWeight: 800, fontSize: 'var(--text-xl)', color: 'var(--color-primary-dark)' }}>
                      ₹{(order.totalAmount / 100).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h4 style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                    {t.orderedProducts}:
                  </h4>
                  {order.items.map((item) => (
                    <div key={item.id} className="flex-between" style={{ padding: 'var(--space-2) 0', borderBottom: '1px dashed var(--color-border-light)' }}>
                      <div>
                        <strong>{item.product.title}</strong> × {item.quantity}
                      </div>
                      <div style={{ fontWeight: 600 }}>₹{(item.subtotal / 100).toLocaleString('en-IN')}</div>
                    </div>
                  ))}
                </div>

                {/* Buyer info */}
                <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', fontSize: 'var(--text-sm)' }}>
                  {order.orderType === 'RETAIL' && order.buyerProfile && (
                    <div>
                      <strong>{t.buyerLabel}:</strong> {order.buyerProfile.fullName} ({order.buyerProfile.phone})<br />
                      <strong>{t.shippingAddress}:</strong> {order.buyerProfile.address}
                    </div>
                  )}
                  {order.orderType === 'B2B' && order.b2bProfile && (
                    <div>
                      <strong>{t.buyerLabel}:</strong> {order.b2bProfile.businessName} (GST: {order.b2bProfile.gstNumber})<br />
                      <strong>{t.contactPhone}:</strong> {order.b2bProfile.contactPhone}<br />
                      <strong>{t.shippingAddress}:</strong> {order.b2bProfile.address}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

