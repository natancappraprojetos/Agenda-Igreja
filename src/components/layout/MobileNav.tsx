'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const mobileNavItems = [
  { href: '/agenda', icon: '📅', label: 'Agenda' },
  { href: '/minha-agenda', icon: '👤', label: 'Minha' },
  { href: '/eventos/novo', icon: '➕', label: 'Novo' },
  { href: '/pendencias', icon: '⚠️', label: 'Pendências' },
  { href: '/pessoas', icon: '👥', label: 'Cadastros' },
];

export default function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/agenda') return pathname === '/agenda';
    if (href === '/pessoas') {
      return pathname.startsWith('/pessoas') ||
        pathname.startsWith('/ministerios') ||
        pathname.startsWith('/locais') ||
        pathname.startsWith('/musicas');
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="mobile-nav">
      <ul className="mobile-nav-list">
        {mobileNavItems.map(item => (
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
