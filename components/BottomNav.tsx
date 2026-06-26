'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', icon: '🗺️', label: 'Mapa' },
  { href: '/buscar', icon: '🔎', label: 'Buscar' },
  { href: '/reportar', icon: '📍', label: 'Reportar' },
  { href: '/validar', icon: '🏗️', label: 'Validar' },
  { href: '/chat', icon: '💬', label: 'Chat' },
];

export default function BottomNav() {
  const path = usePathname();
  if (path === '/login' || path === '/register') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid var(--border)' }}>
      <div className="flex max-w-lg mx-auto">
        {ITEMS.map(item => {
          const active = path === item.href;
          return (
            <Link key={item.href} href={item.href}
              className="flex-1 flex flex-col items-center py-3 gap-0.5 transition-opacity"
              style={{ opacity: active ? 1 : 0.55 }}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium" style={{ color: active ? 'var(--primary)' : 'var(--text-2)' }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
