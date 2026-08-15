'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import Header from '@/components/layout/Header';
import { useState } from 'react';

export default function AdminDashboardPage() {
  const { person, roles, isAdmin, isLeadership } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Header title="Painel Administrativo" onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="app-content">
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
            Olá, {person?.name?.split(' ')[0] || 'Líder'} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Bem-vindo ao painel de controle da Central Santo Afonso.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-4)' }}>
          <Link href="/minha-agenda" className="card" style={{ padding: 'var(--space-5)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ fontSize: '2rem' }}>👤</div>
            <h3 style={{ margin: 0 }}>Minha Agenda</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Veja as escalas e eventos onde você foi escalado.</p>
          </Link>

          <Link href="/eventos/novo" className="card" style={{ padding: 'var(--space-5)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ fontSize: '2rem' }}>➕</div>
            <h3 style={{ margin: 0 }}>Criar Evento (Interno)</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Agende cultos e reuniões com a visão completa.</p>
          </Link>

          <Link href="/" className="card" style={{ padding: 'var(--space-5)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ fontSize: '2rem' }}>📅</div>
            <h3 style={{ margin: 0 }}>Agenda ADM</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Veja todos os eventos. Você tem poder para editar e excluir eventos.</p>
          </Link>

          <Link href="/pessoas" className="card" style={{ padding: 'var(--space-5)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ fontSize: '2rem' }}>👥</div>
            <h3 style={{ margin: 0 }}>Membros</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Gerencie o cadastro de líderes e membros.</p>
          </Link>

          <Link href="/ministerios" className="card" style={{ padding: 'var(--space-5)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ fontSize: '2rem' }}>🏛️</div>
            <h3 style={{ margin: 0 }}>Ministérios</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Acesse a lista e componentes dos ministérios.</p>
          </Link>

          <Link href="/pendencias" className="card" style={{ padding: 'var(--space-5)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ fontSize: '2rem' }}>⚠️</div>
            <h3 style={{ margin: 0 }}>Pendências</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Gerencie as solicitações de eventos pendentes.</p>
          </Link>

          {(isAdmin || isLeadership) && (
            <>
              <Link href="/admin/historico" className="card" style={{ padding: 'var(--space-5)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ fontSize: '2rem' }}>🕒</div>
                <h3 style={{ margin: 0 }}>Histórico de Alterações</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Registro de quem criou, editou ou apagou eventos.</p>
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
