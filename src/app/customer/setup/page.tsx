'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerSetupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setError('Please provide your Full Name and Delivery Address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/customer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address, city, state, pincode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save customer details');
      }

      // Route directly to marketplace home page where all artisan products are shown
      router.push('/marketplace');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>🛍️</div>
          <h1 style={{ color: 'white', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>
            Customer Onboarding
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-base)' }}>
            Enter your delivery details to explore artisan creations
          </p>
        </div>

        <div className="card-glass" style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-2xl)' }}>
          <form onSubmit={handleSubmit}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                className="form-input form-input-lg"
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Delivery Address *</label>
              <textarea
                className="form-input form-textarea"
                placeholder="House No, Street, Landmark..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">City</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Chennai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">State</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Tamil Nadu"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Pincode</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. 600001"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-full"
              style={{ marginTop: 'var(--space-4)' }}
              disabled={loading}
            >
              {loading ? 'Saving Details...' : 'Explore Marketplace →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
