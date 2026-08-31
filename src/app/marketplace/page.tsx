'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface MarketplaceProduct {
  id: string;
  title: string;
  shortDescription: string | null;
  category: string | null;
  material: string | null;
  priceRupees: number;
  priceFormatted: string;
  imageUrl: string | null;
  artisan: {
    name: string;
    artisanId: string;
    location: string | null;
    craftType: string | null;
  };
  inStock: boolean;
  stock: number;
  moq: number;
}

export default function MarketplacePage() {
  const router = useRouter();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchMarketplace();
  }, []);

  const fetchMarketplace = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to load marketplace:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.artisan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.material && p.material.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.priceRupees - b.priceRupees;
    if (sortBy === 'price_desc') return b.priceRupees - a.priceRupees;
    return 0; // Default newest
  });

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {/* Marketplace Header / Hero */}
      <div className="hero">
        <div className="container">
          <h1>Artisan Marketplace</h1>
          <p>Handcrafted products directly from authentic Indian artisans</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-content">
          <Link className="navbar-brand" href="/marketplace">🛍️ Marketplace</Link>
          <div className="navbar-links">
            <Link className="navbar-link" href="/artisan/home">🎨 Artisan Portal</Link>
            <Link className="navbar-link" href="/artisan/orders">📦 Orders</Link>
          </div>
        </div>
      </nav>

      {/* Controls Container */}
      <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
        
        {/* Search & Sort Bar */}
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
          <div style={{ flex: '1 1 300px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search by product name, craft, material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ width: '180px' }}>
            <select
              className="form-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap" style={{ marginBottom: 'var(--space-6)' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Product Grid */}
        {loading ? (
          <div className="page-center">
            <div className="spinner" />
            <p className="loading-text">Loading marketplace items...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏷️</div>
            <div className="empty-state-title">No products found</div>
            <div className="empty-state-text">Try adjusting your search terms or filters</div>
          </div>
        ) : (
          <div className="grid grid-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="product-card"
                onClick={() => router.push(`/marketplace/product/${product.id}`)}
              >
                <div style={{ height: '220px', background: 'var(--color-bg-secondary)', overflow: 'hidden' }}>
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '3rem' }}>
                      🖼️
                    </div>
                  )}
                </div>

                <div className="product-card-body">
                  <div className="product-card-title">{product.title}</div>
                  <div className="product-card-artisan">
                    By <strong>{product.artisan.name}</strong> {product.artisan.location ? `(${product.artisan.location})` : ''}
                  </div>

                  <div className="flex-between" style={{ marginTop: 'var(--space-3)' }}>
                    <div className="product-card-price">{product.priceFormatted}</div>
                    <span className={`badge ${product.inStock ? 'badge-success' : 'badge-danger'}`}>
                      {product.inStock ? `In Stock (${product.stock})` : 'Out of Stock'}
                    </span>
                  </div>

                  {product.moq > 1 && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-dark)', marginTop: 'var(--space-2)', fontWeight: 600 }}>
                      B2B MOQ: {product.moq} units
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
