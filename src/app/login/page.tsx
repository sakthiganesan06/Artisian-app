'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'LOGIN' | 'SIGNUP';
type Role = 'ARTISAN' | 'CUSTOMER';
type Step = 'mode' | 'role' | 'phone' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<Mode>('LOGIN');
  const [role, setRole] = useState<Role>('ARTISAN');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send OTP');
        return;
      }

      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, code, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.details || data.error || 'OTP verification failed');
        return;
      }

      // Route based on selected Role & Profile Status
      if (role === 'ARTISAN') {
        if (data.user.hasProfile) {
          router.push('/artisan/home');
        } else {
          router.push('/language');
        }
      } else {
        // Customer Role
        if (data.user.hasCustomerDetails) {
          router.push('/marketplace');
        } else {
          router.push('/customer/setup');
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when all OTP digits entered
  useEffect(() => {
    if (otp.every(d => d !== '')) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  return (
    <div className="page-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311b92 100%)' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo/Brand */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-2)' }}>🎨</div>
          <h1 style={{ color: 'white', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-1)' }}>
            Artisan Marketplace
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-base)' }}>
            Direct connection between India&apos;s master artisans & buyers
          </p>
        </div>

        {/* Card */}
        <div className="card-glass" style={{
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-8)',
        }}>

          {/* STEP 1: LOGIN vs SIGNUP */}
          {step === 'mode' && (
            <div>
              <h2 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-2)', textAlign: 'center' }}>
                Welcome
              </h2>
              <p style={{ textAlign: 'center', marginBottom: 'var(--space-6)', color: 'var(--color-text-secondary)' }}>
                Select an option to get started
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <button
                  className="btn btn-primary btn-lg btn-full"
                  onClick={() => {
                    setMode('LOGIN');
                    setStep('role');
                  }}
                >
                  🔑 Log In to Account
                </button>

                <button
                  className="btn btn-secondary btn-lg btn-full"
                  onClick={() => {
                    setMode('SIGNUP');
                    setStep('role');
                  }}
                >
                  ✨ Create New Account (Sign Up)
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: AS AN ARTISAN vs AS A CUSTOMER */}
          {step === 'role' && (
            <div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setStep('mode')}
                style={{ marginBottom: 'var(--space-4)' }}
              >
                ← Back
              </button>

              <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)', textAlign: 'center' }}>
                {mode === 'LOGIN' ? 'Log In' : 'Sign Up'}
              </h2>
              <p style={{ textAlign: 'center', marginBottom: 'var(--space-6)', color: 'var(--color-text-secondary)' }}>
                How would you like to use the marketplace?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <button
                  className={`card ${role === 'ARTISAN' ? 'card-body' : 'card-body'}`}
                  style={{
                    border: '2px solid var(--color-primary)',
                    background: 'var(--color-bg-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-4)',
                  }}
                  onClick={() => {
                    setRole('ARTISAN');
                    setStep('phone');
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-1)' }}>🎨 As an Artisan</div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Create products with voice, manage inventory, update stock, and fulfill orders.
                  </p>
                </button>

                <button
                  className="card card-body"
                  style={{
                    border: '2px solid var(--color-success)',
                    background: 'var(--color-bg-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-xl)',
                    padding: 'var(--space-4)',
                  }}
                  onClick={() => {
                    setRole('CUSTOMER');
                    setStep('phone');
                  }}
                >
                  <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-1)' }}>🛍️ As a Customer (Buyer)</div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Explore authentic artisan products, order retail or B2B bulk with dynamic delivery dates.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PHONE NUMBER */}
          {step === 'phone' && (
            <div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setStep('role')}
                style={{ marginBottom: 'var(--space-4)' }}
              >
                ← Back
              </button>

              <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-1)', textAlign: 'center' }}>
                {role === 'ARTISAN' ? '🎨 Artisan Portal' : '🛍️ Customer Portal'}
              </h2>
              <p style={{ textAlign: 'center', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                {mode === 'LOGIN' ? 'Log in' : 'Sign up'} using your 10-digit mobile number
              </p>

              <div className="form-group">
                <label className="form-label">Mobile Phone Number</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <div style={{
                    padding: 'var(--space-3) var(--space-3)',
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-bg-secondary)',
                    fontWeight: 600,
                    fontSize: 'var(--text-base)',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--color-text-secondary)',
                  }}>
                    +91
                  </div>
                  <input
                    className="form-input form-input-lg"
                    type="tel"
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, ''));
                      setError('');
                    }}
                    maxLength={10}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={handleSendOtp}
                disabled={loading || phone.length < 10}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                    Sending OTP...
                  </>
                ) : (
                  'Send Verification OTP →'
                )}
              </button>

              <p style={{
                textAlign: 'center',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                marginTop: 'var(--space-4)',
              }}>
                📱 OTP: 123456 (development mode)
              </p>
            </div>
          )}

          {/* STEP 4: OTP VERIFICATION */}
          {step === 'otp' && (
            <div>
              <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)', textAlign: 'center' }}>
                Verify OTP
              </h2>
              <p style={{ textAlign: 'center', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                Enter the 6-digit verification code sent to +91 {phone}
              </p>

              <div style={{
                display: 'flex',
                gap: 'var(--space-2)',
                justifyContent: 'center',
                marginBottom: 'var(--space-6)',
              }}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                    style={{
                      width: '48px',
                      height: '56px',
                      textAlign: 'center',
                      fontSize: 'var(--text-2xl)',
                      fontWeight: 700,
                      border: '2px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      outline: 'none',
                      transition: 'border-color var(--transition-fast)',
                      fontFamily: 'var(--font-mono)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--color-primary)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--color-border)';
                    }}
                  />
                ))}
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={handleVerifyOtp}
                disabled={loading || otp.some(d => !d)}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                    Verifying OTP...
                  </>
                ) : (
                  'Verify & Continue →'
                )}
              </button>

              <button
                className="btn btn-ghost btn-full"
                style={{ marginTop: 'var(--space-3)' }}
                onClick={() => {
                  setStep('phone');
                  setOtp(['', '', '', '', '', '']);
                  setError('');
                }}
              >
                ← Change Phone Number
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
