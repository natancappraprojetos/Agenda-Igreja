'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function InternalAgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select(`
        *,
        event_type:event_types(name, icon, color),
        location:locations(name)
      `)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
      
    if (data) setEvents(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd/MM/yyyy (EEEE)", { locale: ptBR });
  };

  return (
    <>
      <Header title="Agenda e Eventos" onMenuToggle={() => {}}>
        <Link href="/eventos/novo" className="btn btn-primary btn-sm">
          ➕ Novo Evento
        </Link>
      </Header>
      
      <div className="app-content">
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Próximos Eventos</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Gerencie os cultos, ensaios e reuniões.</p>
        </div>

        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🗓️</div>
            <div className="empty-state-title">Nenhum evento futuro</div>
            <Link href="/eventos/novo" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>➕ Cadastrar Primeiro Evento</Link>
          </div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data e Hora</th>
                  <th>Tipo</th>
                  <th>Título</th>
                  <th>Local</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr key={event.id}>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ textTransform: 'capitalize' }}>{formatDate(event.date)}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{event.start_time.substring(0, 5)}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: event.event_type?.color + '20', color: event.event_type?.color }}>
                        {event.event_type?.icon} {event.event_type?.name}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{event.title}</td>
                    <td>{event.location?.name || '—'}</td>
                    <td>
                      {event.status === 'scheduled' && <span className="badge badge-neutral">Agendado</span>}
                      {event.status === 'confirmed' && <span className="badge badge-success">Confirmado</span>}
                      {event.status === 'cancelled' && <span className="badge badge-danger">Cancelado</span>}
                    </td>
                    <td>
                      <Link href={`/eventos/${event.id}`} className="btn btn-ghost btn-sm">Editar ➔</Link>
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
