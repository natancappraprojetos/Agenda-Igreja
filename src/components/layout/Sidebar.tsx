'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: '/', icon: '📅', label: 'Agenda Geral' },
  { href: '/minha-agenda', icon: '👤', label: 'Minha Agenda' },
  { href: '/eventos/novo', icon: '➕', label: 'Novo Evento' },
  { href: '/pendencias', icon: '⚠️', label: 'Pendências' },
];

const cadastrosItems = [
  { href: '/pessoas', icon: '👥', label: 'Pessoas' },
  { href: '/ministerios', icon: '🏛️', label: 'Ministérios' },
  { href: '/locais', icon: '📍', label: 'Locais' },
  { href: '/musicas', icon: '🎵', label: 'Músicas' },
  { href: '/escalas', icon: '📋', label: 'Escalas' },
];

const adminItems = [
  { href: '/admin/funcoes', icon: '🔧', label: 'Funções' },
  { href: '/admin/tipos-evento', icon: '📂', label: 'Tipos de Evento' },
  { href: '/admin/liturgia-modelos', icon: '📜', label: 'Modelos de Liturgia' },
  { href: '/admin/liturgia-item-tipos', icon: '⏱️', label: 'Itens de Liturgia' },
  { href: '/admin/usuarios', icon: '🔐', label: 'Usuários' },
  { href: '/admin/historico', icon: '📝', label: 'Histórico' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { person, roles, isAdmin, isLeadership, signOut } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const getRoleLabel = () => {
    if (roles.includes('admin')) return 'Administrador';
    if (roles.includes('anciao')) return 'Liderança';
    if (roles.includes('lider_ministerio')) return 'Líder de Ministério';
    if (roles.includes('operacional')) return 'Operacional';
    return 'Membro';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo" style={{ overflow: 'hidden', padding: 0, backgroundColor: 'var(--primary)', borderRadius: '16px' }}>
            <img src="/icon.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div className="sidebar-brand">Igreja Santo Afonso</div>
            <div className="sidebar-brand-sub">Gerenciamento</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <div className="sidebar-section">
            <div className="sidebar-section-title">Cadastros</div>
          </div>

          {cadastrosItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          <Link
            href="/notificacoes"
            className={`sidebar-link ${isActive('/notificacoes') ? 'active' : ''}`}
            onClick={onClose}
          >
            <span className="sidebar-link-icon">🔔</span>
            Notificações
          </Link>

          <div className="sidebar-group">
            <h3 className="sidebar-group-title">Configurações</h3>
            <nav className="sidebar-nav">
              <Link href="/admin/tipos-evento" className={`sidebar-link ${pathname === '/admin/tipos-evento' ? 'active' : ''}`} onClick={onClose}>
                <span className="sidebar-icon">🏷️</span>
                Tipos de Evento
              </Link>

              <Link href="/admin/necessidades" className={`sidebar-link ${pathname === '/admin/necessidades' ? 'active' : ''}`} onClick={onClose}>
                <span className="sidebar-icon">📋</span>
                Necessidades
              </Link>
              <Link href="/admin/liturgia-item-tipos" className={`sidebar-link ${pathname === '/admin/liturgia-item-tipos' ? 'active' : ''}`} onClick={onClose}>
                <span className="sidebar-icon">📜</span>
                Tipos de Liturgia
              </Link>
              <Link href="/admin/usuarios" className={`sidebar-link ${pathname === '/admin/usuarios' ? 'active' : ''}`} onClick={onClose}>
                <span className="sidebar-icon">👥</span>
                Usuários
              </Link>
            </nav>
          </div>

          {(isAdmin || isLeadership) && (
            <>
              <div className="sidebar-section">
                <div className="sidebar-section-title">Administração</div>
              </div>

              {adminItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {person ? getInitials(person.name) : '?'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{person?.name || 'Usuário'}</div>
              <div className="sidebar-user-role">{getRoleLabel()}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm btn-block mt-2"
            onClick={signOut}
            style={{ justifyContent: 'flex-start', paddingLeft: 'var(--space-3)' }}
          >
            <span>🚪</span> Sair
          </button>
        </div>
      </aside>
    </>
  );
}
