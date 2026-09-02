'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChurchEvent, Role, EventParticipant } from '@/lib/types';
import { useToast } from '@/lib/hooks/useToast';
import PersonSelect from './PersonSelect';
import Modal from './Modal';
import MiniCalendar from './MiniCalendar';
import { Calendar, User as UserIcon, CheckCircle2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

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
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newDraft, setNewDraft] = useState<{date: Date | null, time: string, typeId: string}>({ 
    date: null, 
    time: '09:00', 
    typeId: '' 
  });

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
        .in('status', ['scheduled', 'draft'])
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
      
      // Fetch event types for the modal
      const { data: typesData } = await supabase.from('event_types').select('*').order('name');
      if (typesData) setEventTypes(typesData);

    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Erro ao carregar escala' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!newDraft.date || !newDraft.time || !newDraft.typeId) {
      addToast({ type: 'error', title: 'Preencha todos os campos' });
      return;
    }
    setLoading(true);
    try {
      // Format using date-fns to avoid timezone issues (toISOString() shifts to UTC)
      const dateStr = format(newDraft.date, 'yyyy-MM-dd');
      
      // Prevent duplicates
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('date', dateStr)
        .eq('start_time', newDraft.time)
        .eq('event_type_id', newDraft.typeId)
        .maybeSingle();
        
      if (existing) {
        addToast({ type: 'error', title: 'Já existe um espaço ou culto para esta data e horário!' });
        setLoading(false);
        return;
      }
      
      const { error } = await supabase.from('events').insert({
        title: 'Culto (Rascunho)',
        date: dateStr,
        start_time: newDraft.time,
        event_type_id: newDraft.typeId,
        status: 'draft',
      });
      if (error) throw error;
      addToast({ type: 'success', title: 'Espaço de escala criado!' });
      setShowModal(false);
      setNewDraft({ date: null, time: '09:00', typeId: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Erro ao criar espaço' });
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Deseja realmente excluir este espaço de escala? (Qualquer pessoa escalada nele será removida)')) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      addToast({ type: 'success', title: 'Espaço excluído' });
      fetchData();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao excluir' });
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

  const handleAddParticipant = async (eventId: string, roleId: string, personId: string) => {
    try {
      // Check if already in list for this event+role
      const existing = participants[eventId]?.find(p => p.role_id === roleId && p.person_id === personId);
      if (existing) return;
      
      await supabase.from('event_participants').insert({
        event_id: eventId,
        role_id: roleId,
        person_id: personId
      });
      addToast({ type: 'success', title: 'Pessoa adicionada com sucesso!' });
      fetchData();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao adicionar' });
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      await supabase.from('event_participants').delete().eq('id', participantId);
      addToast({ type: 'success', title: 'Pessoa removida' });
      fetchData();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao remover' });
    }
  };

  if (loading) return <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>Carregando escalas...</div>;

  return (
    <>
      <div className="card" style={{ padding: 0, marginBottom: 'var(--space-6)' }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {icon}
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h2>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            + Criar Espaço de Escala
          </button>
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
                            {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                          </div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                            {new Date(event.date + 'T12:00:00').getDate()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{event.event_type?.name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {event.start_time.substring(0, 5)}
                          </div>
                          {event.status === 'draft' && (
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ padding: '0', height: 'auto', color: 'var(--danger)', marginTop: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleDeleteDraft(event.id)}
                            >
                              <Trash2 size={12} /> Excluir Rascunho
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {rolesToManage.map(roleName => {
                      const roleId = roleMap[roleName];
                      const isMultiple = roleName.toLowerCase().includes('congregacional') || roleName.toLowerCase().includes('grupo');
                      const roleAssignees = eventParts.filter(p => p.role_id === roleId);
                      const currentAssignee = roleAssignees.length > 0 ? roleAssignees[0] : null;
                      
                      if (isMultiple) {
                        return (
                          <td key={roleName} style={{ minWidth: '250px', verticalAlign: 'top', paddingTop: 'var(--space-2)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                              {roleAssignees.map(assignee => (
                                <div key={assignee.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--background-secondary)', padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}>
                                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{assignee.person?.name}</span>
                                  <button 
                                    className="btn-icon" 
                                    onClick={() => handleRemoveParticipant(assignee.id)}
                                    style={{ padding: '2px', color: 'var(--text-danger)' }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                              <PersonSelect 
                                value=""
                                onChange={(personId) => personId && handleAddParticipant(event.id, roleId, personId)}
                                placeholder="Adicionar..."
                                roleId={roleId}
                              />
                            </div>
                          </td>
                        );
                      }
                      
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

    <Modal 
      isOpen={showModal} 
      onClose={() => setShowModal(false)}
      title="Criar Espaço para Escala"
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreateDraft}>Criar Espaço</button>
        </div>
      }
    >
      <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: '0.9rem' }}>
        Crie um espaço de evento antecipado para poder escalar sua equipe. Este rascunho não aparecerá na agenda geral até que o culto seja oficialmente criado.
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <div>
          <h4 style={{ marginBottom: 'var(--space-2)' }}>1. Selecione a Data</h4>
          <MiniCalendar 
            selectedDate={newDraft.date} 
            onSelectDate={d => setNewDraft({...newDraft, date: d})} 
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label>2. Horário do Evento</label>
            <input type="time" className="input" value={newDraft.time} onChange={e => setNewDraft({...newDraft, time: e.target.value})} />
          </div>
          
          <div className="form-group">
            <label>3. Tipo de Evento</label>
            <select className="input" value={newDraft.typeId} onChange={e => setNewDraft({...newDraft, typeId: e.target.value})}>
              <option value="">Selecione...</option>
              {eventTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Modal>
    </>
  );
}
