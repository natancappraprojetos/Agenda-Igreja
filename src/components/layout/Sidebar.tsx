'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  CalendarDays, LayoutDashboard, PlusCircle, AlertTriangle, 
  Users, Landmark, MapPin, Bell, Tags, ClipboardList, 
  ScrollText, UserCog, Wrench, BookOpen, History, LogOut
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { href: '/', icon: <CalendarDays size={20} />, label: 'Agenda Geral' },
  { href: '/minha-agenda', icon: <LayoutDashboard size={20} />, label: 'Visão Geral' },
  { href: '/eventos/novo', icon: <PlusCircle size={20} />, label: 'Novo Evento' },
  { href: '/pendencias', icon: <AlertTriangle size={20} />, label: 'Pendências' },
];

const cadastrosItems = [
  { href: '/pessoas', icon: <Users size={20} />, label: 'Pessoas' },
  { href: '/ministerios', icon: <Landmark size={20} />, label: 'Ministérios' },
  { href: '/locais', icon: <MapPin size={20} />, label: 'Locais' },
  { href: '/escalas', icon: <ClipboardList size={20} />, label: 'Escalas' },
];

const adminItems = [
  { href: '/admin', icon: <LayoutDashboard size={20} />, label: 'Painel ADM' },
  { href: '/admin/configuracoes', icon: <Wrench size={20} />, label: 'Configurações' },
  { href: '/admin/historico', icon: <History size={20} />, label: 'Histórico' },
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
          <div className="sidebar-logo" style={{ overflow: 'hidden', padding: 0, backgroundColor: 'transparent', borderRadius: '50%', width: '40px', height: '40px' }}>
            <img src="/icon.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: 'var(--primary)' }} />
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
            <span className="sidebar-link-icon"><Bell size={20} /></span>
            Notificações
          </Link>



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
            style={{ justifyContent: 'flex-start', paddingLeft: 'var(--space-3)', color: 'var(--text-secondary)' }}
          >
            <LogOut size={18} style={{ marginRight: '8px' }} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
}
