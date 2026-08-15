'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';

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
    
    // Fetch profiles manually
    const userIds = [...new Set(logsData.map(l => l.user_id).filter(Boolean))];
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);
        
      const profileMap = Object.fromEntries((profilesData || []).map(p => [p.id, p.name]));
      
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
      default:
        return type;
    }
  };

  return (
    <>
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
                    <td style={{ fontWeight: 600 }}>
                      {log.profiles?.name || 'Sistema'}
                    </td>
                    <td>{getActionLabel(log.action)}</td>
                    <td>
                      {getEntityLabel(log.entity_type, log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
