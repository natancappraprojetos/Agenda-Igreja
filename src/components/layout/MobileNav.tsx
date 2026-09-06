'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/lib/hooks/useAuth';

const mobileNavItems = [
  { href: '/', icon: '📅', label: 'Agenda' },
  { href: '/eventos/novo', icon: '➕', label: 'Novo' },
  { href: '/pessoas', icon: '👥', label: 'Cadastros' },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/pessoas') {
      return pathname.startsWith('/pessoas') ||
        pathname.startsWith('/ministerios') ||
        pathname.startsWith('/locais') ||
        pathname.startsWith('/escalas');
    }
    return pathname.startsWith(href);
  };

  const getVisibleItems = () => {
    let items = [...mobileNavItems];
    if (isAdmin) {
      items.splice(1, 0, { href: '/minha-agenda', icon: '👤', label: 'Visão' });
      items.splice(3, 0, { href: '/pendencias', icon: '⚠️', label: 'Pendências' });
    }
    return items;
  };

  return (
    <nav className="mobile-nav">
      <ul className="mobile-nav-list">
        {getVisibleItems().map(item => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`mobile-nav-link ${isActive(item.href) ? 'active' : ''}`}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
