'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChurchEvent, Role, EventParticipant } from '@/lib/types';
import { useToast } from '@/lib/hooks/useToast';
import PersonSelect from './PersonSelect';
import { Calendar, User as UserIcon, CheckCircle2 } from 'lucide-react';

interface EscalasGridProps {
  title: string;
  icon: React.ReactNode;
  eventTypesToInclude?: string[]; // e.g., ['Culto de Sábado', 'Culto de Quarta']
  rolesToManage: string[]; // e.g., ['Pregador(a)'] or ['Cantor(a) Solo', 'Cantor(a) Congregacional']
}

export default function EscalasGrid({ title, icon, eventTypesToInclude, rolesToManage }: EscalasGridProps) {
  const supabase = createClient();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [participants, setParticipants] = useState<Record<string, EventParticipant[]>>({});
  const [roleMap, setRoleMap] = useState<Record<string, string>>({}); // name -> id

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch the requested roles
      const { data: rolesData } = await supabase
        .from('roles')
        .select('id, name')
        .in('name', rolesToManage);

      const rMap: Record<string, string> = {};
      rolesData?.forEach(r => { rMap[r.name] = r.id; });
      setRoleMap(rMap);

      // 2. Fetch upcoming events
      let eventsQuery = supabase
        .from('events')
        .select('*, event_type:event_types(name)')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(20);
        
      const { data: eData } = await eventsQuery;
      
      // Filter events in memory based on eventTypesToInclude if provided
      let filteredEvents = (eData || []) as ChurchEvent[];
      if (eventTypesToInclude && eventTypesToInclude.length > 0) {
        filteredEvents = filteredEvents.filter(e => e.event_type && eventTypesToInclude.includes(e.event_type.name));
      } else {
        // Se não forneceu, vamos puxar pelo menos Cultos por padrão
        filteredEvents = filteredEvents.filter(e => e.event_type && e.event_type.name.toLowerCase().includes('culto'));
      }
      setEvents(filteredEvents);

      // 3. Fetch participants for these events, for the managed roles
      if (filteredEvents.length > 0 && rolesData && rolesData.length > 0) {
        const eventIds = filteredEvents.map(e => e.id);
        const roleIds = rolesData.map(r => r.id);
        
        const { data: pData } = await supabase
          .from('event_participants')
          .select('*, person:people(id, name, whatsapp)')
          .in('event_id', eventIds)
          .in('role_id', roleIds);

        const pMap: Record<string, EventParticipant[]> = {};
        pData?.forEach(p => {
          if (!pMap[p.event_id]) pMap[p.event_id] = [];
          pMap[p.event_id].push(p as EventParticipant);
        });
        setParticipants(pMap);
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Erro ao carregar escala' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPerson = async (eventId: string, roleName: string, personId: string | null) => {
    const roleId = roleMap[roleName];
    if (!roleId) return;

    try {
      // Find existing participant for this specific event and role
      const existing = participants[eventId]?.find(p => p.role_id === roleId);

      if (!personId) {
        // REMOVE assignment
        if (existing) {
          await supabase.from('event_participants').delete().eq('id', existing.id);
          addToast({ type: 'success', title: 'Escala removida' });
        }
      } else {
        // ADD or UPDATE assignment
        if (existing) {
          await supabase.from('event_participants').update({ person_id: personId }).eq('id', existing.id);
        } else {
          await supabase.from('event_participants').insert({
            event_id: eventId,
            role_id: roleId,
            person_id: personId
          });
        }
        addToast({ type: 'success', title: 'Escala salva com sucesso!' });
      }
      // Refresh silently
      fetchData();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao salvar escala' });
    }
  };

  if (loading) return <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>Carregando escalas...</div>;

  return (
    <div className="card" style={{ padding: 0, marginBottom: 'var(--space-6)' }}>
      <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {icon}
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h2>
      </div>
      
      <div style={{ overflowX: 'auto', paddingBottom: '150px' }}>
        <table className="data-table" style={{ width: '100%', minWidth: '600px' }}>
          <thead>
            <tr>
              <th style={{ width: '250px' }}>Data e Evento</th>
              {rolesToManage.map(r => <th key={r}>{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={rolesToManage.length + 1} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-tertiary)' }}>
                  Nenhum evento encontrado nos próximos dias.
                </td>
              </tr>
            ) : (
              events.map(event => {
                const eventParts = participants[event.id] || [];
                return (
                  <tr key={event.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ 
                          backgroundColor: 'var(--background-secondary)', 
                          padding: 'var(--space-2)', 
                          borderRadius: 'var(--radius-md)',
                          textAlign: 'center',
                          minWidth: '50px'
                        }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>
                            {new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'short' })}
                          </div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                            {new Date(event.date).getDate()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{event.event_type?.name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {event.start_time.substring(0, 5)}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {rolesToManage.map(roleName => {
                      const roleId = roleMap[roleName];
                      const currentAssignee = eventParts.find(p => p.role_id === roleId);
                      
                      return (
                        <td key={roleName} style={{ minWidth: '250px', verticalAlign: 'middle' }}>
                          <PersonSelect 
                            value={currentAssignee?.person_id || ''}
                            onChange={(personId) => handleAssignPerson(event.id, roleName, personId)}
                            placeholder="Definir..."
                            roleId={roleId}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
