'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Lightweight self-hosted page-view beacon. Fires on every route change.
export default function Track() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, ref: typeof document !== 'undefined' ? document.referrer : '' }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);
  return null;
}
