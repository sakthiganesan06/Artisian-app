'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

interface PublicArtisanProfile {
  artisanId: string;
  name: string;
  location: string | null;
  district: string | null;
  state: string | null;
  craftType: string | null;
  experience: string | null;
  artisanStory: string | null;
  profileImageUrl: string | null;
  products: Array<{
    id: string;
    title: string;
    shortDescription: string | null;
    priceFormatted: string;
    category: string | null;
    imageUrl: string | null;
    inStock: boolean;
  }>;
}

export default function PublicArtisanProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<PublicArtisanProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPublicProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPublicProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/artisan/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      } else {
        setError('Artisan profile not found');
      }
    } catch {
      setError('Failed to load artisan profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-center">
        <div className="spinner" />
        <p className="loading-text">Loading public artisan profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-center">
        <div className="alert alert-error">{error || 'Profile unavailable'}</div>
        <button className="btn btn-primary" onClick={() => router.push('/marketplace')}>
          Go to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="navbar-content">
          <a className="navbar-brand" href="/marketplace">🛍️ Marketplace</a>
          <button className="btn btn-ghost" onClick={() => router.push('/marketplace')}>
            Browse Products
          </button>
        </div>
      </nav>

      {/* Header Banner */}
      <div className="hero" style={{ padding: 'var(--space-12) var(--space-6)' }}>
        <div className="container container-md">
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            background: 'rgba(255,255,255,0.2)',
            padding: 'var(--space-1) var(--space-4)',
            borderRadius: 'var(--radius-full)',
            display: 'inline-block',
            marginBottom: 'var(--space-3)',
          }}>
            ARTISAN ID: {profile.artisanId}
          </div>

          <h1 style={{ fontSize: 'var(--text-4xl)', marginBottom: 'var(--space-2)' }}>{profile.name}</h1>
          <p style={{ fontSize: 'var(--text-lg)', opacity: 0.9 }}>
            {profile.craftType || 'Craftsperson'}{' '}
            {profile.location ? `• ${profile.location}` : ''}
            {profile.experience ? ` • ${profile.experience} experience` : ''}
          </p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
        {/* Story Section */}
        {profile.artisanStory && (
          <div className="card card-body" style={{ marginBottom: 'var(--space-8)' }}>
            <h3 style={{ marginBottom: 'var(--space-3)' }}>📜 Artisan Story</h3>
            <p style={{ fontSize: 'var(--text-base)', lineHeight: 1.8, fontStyle: 'italic' }}>
              &ldquo;{profile.artisanStory}&rdquo;
            </p>
          </div>
        )}

        {/* Products Section */}
        <h2 style={{ marginBottom: 'var(--space-6)' }}>Handcrafted Products by {profile.name}</h2>

        {profile.products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎨</div>
            <div className="empty-state-title">No published products yet</div>
            <div className="empty-state-text">Check back soon for new handcrafted creations</div>
          </div>
        ) : (
          <div className="grid grid-3">
            {profile.products.map((p) => (
              <div
                key={p.id}
                className="product-card"
                onClick={() => router.push(`/marketplace/product/${p.id}`)}
              >
                <div style={{ height: '220px', background: 'var(--color-bg-secondary)', overflow: 'hidden' }}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '3rem' }}>
                      🖼️
                    </div>
                  )}
                </div>

                <div className="product-card-body">
                  <div className="product-card-title">{p.title}</div>
                  <div className="flex-between" style={{ marginTop: 'var(--space-3)' }}>
                    <div className="product-card-price">{p.priceFormatted}</div>
                    <span className={`badge ${p.inStock ? 'badge-success' : 'badge-danger'}`}>
                      {p.inStock ? 'In Stock' : 'Out of Stock'}
                    </span>
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
