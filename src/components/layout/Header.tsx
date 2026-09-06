'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useUnreadNotificationsCount } from '@/lib/hooks/useUnreadNotificationsCount';
interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
  children?: React.ReactNode;
}

export default function Header({ title, onMenuToggle, children }: HeaderProps) {
  const notificationsData = useUnreadNotificationsCount();

  const handleToggle = () => {
    if (onMenuToggle) {
      onMenuToggle();
    }
    // Dispatch a global event so layout.tsx can open the sidebar
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('toggleSidebar'));
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={handleToggle} aria-label="Menu">
          ☰
        </button>
        <h1 className="header-title">{title}</h1>
      </div>
      <div className="header-right">
        {children}
        <Link href="/notificacoes" style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: 'var(--space-3)', color: 'var(--text-secondary)' }}>
          <Bell size={20} />
          {notificationsData.count > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: 'var(--danger)',
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: notificationsData.hasUrgent ? 'pulse 1.5s infinite' : 'none',
              boxShadow: notificationsData.hasUrgent ? '0 0 8px var(--danger)' : 'none'
            }}>
              {notificationsData.count > 9 ? '9+' : notificationsData.count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
