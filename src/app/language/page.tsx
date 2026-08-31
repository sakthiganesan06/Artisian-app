'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/lib/validations';

export default function LanguageSelectionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (code: string) => {
    setSelected(code);
    setLoading(true);

    try {
      // Save language preference to profile
      // If profile doesn't exist yet, we'll save it during onboarding
      document.cookie = `locale=${code};path=/;max-age=${365 * 24 * 60 * 60}`;

      // Brief delay for visual feedback
      await new Promise(r => setTimeout(r, 300));

      router.push('/artisan/onboarding');
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ background: 'var(--color-bg)' }}>
      <div className="container container-lg">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)', paddingTop: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🌐</div>
          <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-3)' }}>
            Choose Your Language
          </h1>
          <p style={{ fontSize: 'var(--text-lg)', maxWidth: '500px', margin: '0 auto' }}>
            Select the language you are most comfortable with.
            All instructions will be shown in your language.
          </p>
        </div>

        <div className="language-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`language-card ${selected === lang.code ? 'selected' : ''}`}
              onClick={() => handleSelect(lang.code)}
              disabled={loading}
              style={{ position: 'relative' }}
            >
              {selected === lang.code && loading && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,255,255,0.8)',
                  borderRadius: 'inherit',
                }}>
                  <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                </div>
              )}
              <div className="language-card-native">{lang.nativeName}</div>
              <div className="language-card-name">{lang.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
