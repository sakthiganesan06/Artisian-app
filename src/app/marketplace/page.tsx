'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategory, sort]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (selectedCategory) query.set('category', selectedCategory);
      if (sort) query.set('sort', sort);

      const res = await fetch(`/api/marketplace/products?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Marketplace fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

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
          <a className="navbar-brand" href="/marketplace">🛍️ Marketplace</a>
          <div className="navbar-links">
            <a className="navbar-link" href="/artisan/home">🎨 Artisan Portal</a>
            <a className="navbar-link" href="/artisan/orders">📦 Orders</a>
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ width: '180px' }}>
            <select
              className="form-input"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap" style={{ marginBottom: 'var(--space-6)' }}>
            <button
              className={`btn btn-sm ${selectedCategory === '' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory('')}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
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
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏷️</div>
            <div className="empty-state-title">No products found</div>
            <div className="empty-state-text">Try adjusting your search terms or filters</div>
          </div>
        ) : (
          <div className="grid grid-3">
            {products.map((product) => (
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
