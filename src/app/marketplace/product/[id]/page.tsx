'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProductDetail {
  id: string;
  title: string;
  shortDescription: string | null;
  longDescription: string | null;
  highlights: string[];
  category: string | null;
  material: string | null;
  craftTechnique: string | null;
  dimensions: string | null;
  color: string | null;
  weight: string | null;
  productionTime: string | null;
  priceRupees: number;
  priceFormatted: string;
  images: Array<{ id: string; url: string; originalUrl: string }>;
  artisan: {
    name: string;
    artisanId: string;
    location: string | null;
    craftType: string | null;
    experience: string | null;
    artisanStory: string | null;
  };
  stock: number;
  inStock: boolean;
  moq: number;
}

interface DeliveryEstimate {
  formattedRange: string;
  processingDays: number;
  shippingDays: number;
  stockStatusNote?: string;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const router = useRouter();
  const [productId, setProductId] = useState<string>('');

  useEffect(() => {
    // Handle both Promise<params> (Next.js 15) and direct params
    if (params instanceof Promise) {
      params.then((p) => setProductId(p.id));
    } else {
      setProductId((params as { id: string }).id);
    }
  }, [params]);

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');

  // Order Flow State
  const [orderMode, setOrderMode] = useState<'NONE' | 'RETAIL' | 'B2B'>('NONE');
  const [quantity, setQuantity] = useState<number>(1);
  const [stockValid, setStockValid] = useState<boolean>(true);
  const [stockError, setStockError] = useState<string>('');
  const [deliveryEstimate, setDeliveryEstimate] = useState<DeliveryEstimate | null>(null);

  // Buyer Form Inputs
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // B2B Form Inputs
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Order Processing
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<{
    orderId: string;
    totalFormatted: string;
    deliveryRange: string;
  } | null>(null);
  const [error, setError] = useState('');

  const [isArtisanOwner, setIsArtisanOwner] = useState(false);

  const checkSessionAndOwner = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.user?.role === 'ARTISAN') {
          setIsArtisanOwner(true);
        }
      }
    } catch {}
  };

  const fetchProduct = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/marketplace/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        const p = data.product;
        // Ensure highlights is always an array
        if (p && !Array.isArray(p.highlights)) {
          try {
            p.highlights = typeof p.highlights === 'string' ? JSON.parse(p.highlights) : [];
          } catch {
            p.highlights = [];
          }
        }
        setProduct(p);
        if (p?.images?.length > 0) {
          setSelectedImage(p.images[0].url);
        }
      } else {
        setError('Product not found or unavailable');
      }
    } catch {
      setError('Failed to load product. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!productId) return;
    checkSessionAndOwner();
    fetchProduct(productId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // Stock & Delivery Validation
  const validateStockAndEstimate = async (qty: number, mode: 'RETAIL' | 'B2B') => {
    setStockError('');
    try {
      const res = await fetch('/api/orders/check-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productId,
          quantity: qty,
          orderType: mode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.available || !data.moqSatisfied) {
        setStockValid(false);
        setStockError(data.error || 'Stock unavailable for this quantity');
        setDeliveryEstimate(null);
      } else {
        setStockValid(true);
        setDeliveryEstimate(data.deliveryEstimate);
      }
    } catch {
      setStockError('Failed to validate stock');
    }
  };

  const handleModeSelect = (mode: 'RETAIL' | 'B2B') => {
    setOrderMode(mode);
    const initialQty = mode === 'B2B' ? (product?.moq || 5) : 1;
    setQuantity(initialQty);
    validateStockAndEstimate(initialQty, mode);
  };

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1) return;
    setQuantity(newQty);
    if (orderMode !== 'NONE') {
      validateStockAndEstimate(newQty, orderMode);
    }
  };

  // Order Submission
  const handlePlaceOrder = async () => {
    setError('');

    if (orderMode === 'RETAIL') {
      if (!fullName.trim() || !phone.trim() || !address.trim()) {
        setError('Please fill in Name, Phone, and Address');
        return;
      }
    } else if (orderMode === 'B2B') {
      if (!businessName.trim() || !phone.trim() || !address.trim() || !gstNumber.trim()) {
        setError('Please fill in Business Name, GST Number, Phone, and Address');
        return;
      }
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(gstNumber)) {
        setError('Invalid GST Number format (e.g. 22AAAAA0000A1Z5)');
        return;
      }
    }

    setOrderSubmitting(true);

    try {
      const payload = {
        productId: productId,
        quantity,
        orderType: orderMode,
        buyerDetails: orderMode === 'RETAIL' ? {
          fullName,
          phone,
          address,
          city: null,
          state: null,
          pincode: null,
        } : undefined,
        b2bDetails: orderMode === 'B2B' ? {
          businessName,
          gstNumber,
          contactPhone: phone,
          address,
          city: null,
          state: null,
          pincode: null,
        } : undefined,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      setCreatedOrder({
        orderId: data.order.orderId,
        totalFormatted: data.order.totalFormatted,
        deliveryRange: data.order.deliveryEstimate?.formattedRange || 'Estimated within 7-10 days',
      });

      // Refresh product stock
      fetchProduct(productId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order submission failed');
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (!productId || loading) {
    return (
      <div className="page-center">
        <div className="spinner" />
        <p className="loading-text">Loading product details...</p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="page-center">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-primary" onClick={() => router.push('/marketplace')}>
          ← Back to Marketplace
        </button>
      </div>
    );
  }

  if (!product) return null;

  // Safe highlights array
  const highlights = Array.isArray(product.highlights) ? product.highlights : [];

  // Order Confirmation Success View
  if (createdOrder) {
    return (
      <div className="page-center" style={{ background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center', maxWidth: '540px' }} className="card card-body">
          <div className="order-success-icon">✓</div>
          <h2>Order Confirmed!</h2>
          <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
            Thank you for supporting authentic local artisans.
          </p>

          <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Order ID:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{createdOrder.orderId}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Total Amount:</span>
              <strong style={{ color: 'var(--color-primary-dark)' }}>{createdOrder.totalFormatted}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Expected Delivery:</span>
              <strong>{createdOrder.deliveryRange}</strong>
            </div>
          </div>

          <div className="alert alert-success" style={{ textAlign: 'left', marginBottom: 'var(--space-6)' }}>
            🔔 Notification has been sent to artisan <strong>{product.artisan?.name}</strong> to process your order.
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <button className="btn btn-primary btn-full" onClick={() => router.push('/marketplace')}>
              🛍️ Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="navbar-content">
          <a className="navbar-brand" href="/marketplace">🛍️ Marketplace</a>
          <button className="btn btn-ghost" onClick={() => router.push('/marketplace')}>
            ← Back to Marketplace
          </button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
        <div className="grid grid-2" style={{ alignItems: 'start', gap: 'var(--space-8)' }}>
          
          {/* Left: Gallery */}
          <div>
            <div style={{ height: '380px', borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--color-bg-secondary)', marginBottom: 'var(--space-4)' }}>
              {selectedImage ? (
                <img src={selectedImage} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '4rem' }}>🖼️</div>
              )}
            </div>

            {(product.images?.length ?? 0) > 1 && (
              <div className="flex gap-3">
                {product.images.map((img) => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt="Thumbnail"
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: 'var(--radius-md)',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      border: selectedImage === img.url ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    }}
                    onClick={() => setSelectedImage(img.url)}
                  />
                ))}
              </div>
            )}

            {/* Artisan Profile Card */}
            {product.artisan && (
              <div className="card card-body" style={{ marginTop: 'var(--space-6)' }}>
                <h4 style={{ marginBottom: 'var(--space-2)' }}>🎨 Meet the Artisan</h4>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{product.artisan.name}</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                  {product.artisan.craftType} {product.artisan.location ? `• ${product.artisan.location}` : ''}
                </div>

                {product.artisan.artisanStory && (
                  <p style={{ fontStyle: 'italic', fontSize: 'var(--text-sm)' }}>
                    &ldquo;{product.artisan.artisanStory}&rdquo;
                  </p>
                )}

                {product.artisan.artisanId && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 'var(--space-3)' }}
                    onClick={() => router.push(`/artisan/${product.artisan.artisanId}`)}
                  >
                    View Public Artisan Profile & QR →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Product Details & Order Flow */}
          <div>
            <span className="badge badge-info" style={{ marginBottom: 'var(--space-2)' }}>
              {product.category || 'Handcraft'}
            </span>
            <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-3)' }}>{product.title}</h1>
            
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-primary-dark)', marginBottom: 'var(--space-4)' }}>
              {product.priceFormatted}
            </div>

            {/* Product Story & Description */}
            <div className="card card-body" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <h4 style={{ margin: 0 }}>📖 Product Story & Details</h4>
                <span className="badge badge-primary" style={{ fontSize: 'var(--text-xs)' }}>
                  Multilingual
                </span>
              </div>

              {product.shortDescription && (
                <div style={{
                  padding: 'var(--space-3)',
                  background: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-4)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text)',
                  fontWeight: 500,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                }}>
                  {product.shortDescription}
                </div>
              )}

              {product.longDescription && (
                <div style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-line',
                }}>
                  {product.longDescription}
                </div>
              )}

              {highlights.length > 0 && (
                <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-border-light)', paddingTop: 'var(--space-3)' }}>
                  <strong style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>
                    Key Highlights
                  </strong>
                  <ul style={{ margin: 'var(--space-2) 0 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                    {highlights.map((hl, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>{hl}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Product Specifications */}
            <div className="card card-body" style={{ marginBottom: 'var(--space-6)', background: 'var(--color-bg-secondary)' }}>
              <h4 style={{ marginBottom: 'var(--space-3)' }}>Product Specifications</h4>
              <div className="grid grid-2" style={{ gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                {product.material && <div><strong>Material:</strong> {product.material}</div>}
                {product.craftTechnique && <div><strong>Craft:</strong> {product.craftTechnique}</div>}
                {product.dimensions && <div><strong>Dimensions:</strong> {product.dimensions}</div>}
                {product.productionTime && <div><strong>Production Time:</strong> {product.productionTime}</div>}
                <div><strong>Current Stock:</strong> {product.stock} units</div>
                <div><strong>B2B MOQ:</strong> {product.moq} units</div>
              </div>
            </div>

            {/* ORDER FLOW OR ARTISAN VIEW */}
            {isArtisanOwner ? (
              <div className="card card-body" style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid var(--color-primary-light)', padding: 'var(--space-5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontSize: '1.25rem' }}>🎨</span>
                  <h4 style={{ margin: 0, color: 'var(--color-primary-dark)' }}>Artisan Catalog View</h4>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.6 }}>
                  You are viewing your product as a customer would see it. To update pricing or stock, visit your artisan dashboard.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => router.push('/artisan/home')}>
                    ← Go to Artisan Dashboard
                  </button>
                  <button className="btn btn-secondary" onClick={() => router.push('/artisan/orders')}>
                    📦 View Received Orders
                  </button>
                </div>
              </div>
            ) : !product.inStock ? (
              <div className="alert alert-error">
                This product is currently out of stock.
              </div>
            ) : orderMode === 'NONE' ? (
              <div>
                <h3 style={{ marginBottom: 'var(--space-3)' }}>How are you purchasing?</h3>
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <button
                    className="btn btn-primary btn-lg"
                    style={{ flex: 1 }}
                    onClick={() => handleModeSelect('RETAIL')}
                  >
                    🛒 AS A BUYER
                  </button>
                  <button
                    className="btn btn-secondary btn-lg"
                    style={{ flex: 1 }}
                    onClick={() => handleModeSelect('B2B')}
                  >
                    🏢 AS A B2B BULK BUYER
                  </button>
                </div>
              </div>
            ) : (
              <div className="card card-body">
                <div className="flex-between" style={{ marginBottom: 'var(--space-4)' }}>
                  <h3>Checkout — {orderMode === 'RETAIL' ? 'Retail Buyer' : 'B2B Bulk Buyer'}</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => setOrderMode('NONE')}>
                    Change Mode
                  </button>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                {/* Quantity Input */}
                <div className="form-group">
                  <label className="form-label">
                    Quantity {orderMode === 'B2B' && `(Min MOQ: ${product.moq})`}
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleQuantityChange(quantity - 1)}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      className="form-input"
                      style={{ width: '100px', textAlign: 'center', fontWeight: 700 }}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleQuantityChange(quantity + 1)}
                    >
                      +
                    </button>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginLeft: 'auto' }}>
                      Subtotal: ₹{(product.priceRupees * quantity).toLocaleString('en-IN')}
                    </div>
                  </div>
                  {stockError && <div className="form-error">{stockError}</div>}
                </div>

                {/* Delivery Estimate */}
                {deliveryEstimate && (
                  <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
                    <div>🚚 <strong>Expected Delivery:</strong> {deliveryEstimate.formattedRange}</div>
                    {deliveryEstimate.stockStatusNote && (
                      <div style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                        {deliveryEstimate.stockStatusNote}
                      </div>
                    )}
                  </div>
                )}

                {/* Forms */}
                {orderMode === 'RETAIL' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input className="form-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Delivery Address *</label>
                      <textarea className="form-input form-textarea" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Complete door address with city, state and PIN..." />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Business / Company Name *</label>
                      <input className="form-input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Crafts India Traders Pvt Ltd" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">GST Number * (Format: 22AAAAA0000A1Z5)</label>
                      <input className="form-input" value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase())} placeholder="33AAAAA0000A1Z5" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Phone Number *</label>
                      <input className="form-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Business Delivery Address *</label>
                      <textarea className="form-input form-textarea" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full business warehouse/store address..." />
                    </div>
                  </>
                )}

                <button
                  className="btn btn-success btn-lg btn-full"
                  onClick={handlePlaceOrder}
                  disabled={orderSubmitting || !stockValid}
                >
                  {orderSubmitting ? (
                    <>
                      <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                      Processing Order & Stock...
                    </>
                  ) : (
                    `Place Order (Total: ₹${(product.priceRupees * quantity).toLocaleString('en-IN')})`
                  )}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
