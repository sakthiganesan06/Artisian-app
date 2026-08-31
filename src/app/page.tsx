'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check auth status and redirect to appropriate role dashboard
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          if (data.user.role === 'CUSTOMER') {
            router.replace('/marketplace');
          } else if (data.user.hasProfile) {
            router.replace('/artisan/home');
          } else {
            router.replace('/language');
          }
        } else {
          router.replace('/login');
        }
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  return (
    <div className="page-center">
      <div className="spinner" />
      <p className="loading-text">Loading Artisan Marketplace...</p>
    </div>
  );
}
