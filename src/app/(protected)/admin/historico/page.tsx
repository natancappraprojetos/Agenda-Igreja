'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import ProtectedRoute from '@/components/ui/ProtectedRoute';
import { useAuth } from '@/lib/hooks/useAuth';

interface HistoryLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  created_at: string;
  profiles: {
    name: string;
  };
}

export default function HistoricoPage() {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const supabase = createClient();
  const { person } = useAuth();

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    // Remove the implicit join which fails without a direct FK
    const { data, error } = await supabase
      .from('history_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erro ao buscar logs:', error);
      setLoading(false);
      return;
    }

    const logsData = data || [];
    
    // Fetch users and their person names
    const userIds = [...new Set(logsData.map(l => l.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, person:people(name)')
        .in('id', userIds);
        
      if (usersError) console.error('Error fetching users for logs:', usersError);
        
      const profileMap = Object.fromEntries(
        (usersData || []).map((u: any) => [u.id, u.person?.name || 'Administrador do Sistema'])
      );
      
      const enrichedLogs = logsData.map(log => ({
        ...log,
        profiles: { name: profileMap[log.user_id] || 'Desconhecido' }
      }));
      setLogs(enrichedLogs as any);
    } else {
      setLogs(logsData as any);
    }
    
    setLoading(false);
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'INSERT': return <span className="badge badge-success">Adicionou</span>;
      case 'UPDATE': return <span className="badge badge-primary">Alterou</span>;
      case 'DELETE': return <span className="badge badge-danger">Apagou</span>;
      default: return <span className="badge badge-neutral">{action}</span>;
    }
  };

  const getEntityLabel = (type: string, details: any) => {
    switch (type) {
      case 'events':
        return `Evento: ${details.title || 'Desconhecido'}`;
      case 'event_participants':
        return `Participante (Escala)`;
      case 'liturgy_items':
        return `Item da Liturgia: ${details.title || 'Desconhecido'}`;
      case 'person_roles':
        return `Membro da Equipe`;
      case 'people':
        return `Cadastro de Pessoa: ${details.name || 'Desconhecido'}`;
      default:
        return type;
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <Header title="Histórico de Alterações" onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="app-content">
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Log de Auditoria</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          Acompanhe quem criou, alterou ou apagou itens no sistema.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Carregando histórico...</div>
        ) : logs.length === 0 ? (
          <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Nenhuma alteração registrada ainda.</p>
          </div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td>
                      {log.user_id === person?.id ? (
                        <strong>Você</strong>
                      ) : (
                        log.profiles?.name || 'Desconhecido'
                      )}
                    </td>
                    <td>{getActionLabel(log.action)}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>
                        {getEntityLabel(log.entity_type, log.details)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
