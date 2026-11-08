'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChurchEvent, EventParticipant } from '@/lib/types';
import { useToast } from '@/lib/hooks/useToast';
import PersonSelect from './PersonSelect';
import Modal from './Modal';
import MiniCalendar from './MiniCalendar';
import { Trash2, Printer, Download, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import {
  getMonthDays, isToday, isSameDay, formatMonthYear, toDateString, parseDate
} from '@/lib/utils/dates';
import { formatTime } from '@/lib/utils/liturgy-calculator';

interface EscalasCalendarProps {
  title: string;
  icon: React.ReactNode;
  eventTypesToInclude?: string[];
  rolesToManage: string[];
}

export default function EscalasCalendar({ title, icon, eventTypesToInclude, rolesToManage }: EscalasCalendarProps) {
  const supabase = createClient();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [participants, setParticipants] = useState<Record<string, EventParticipant[]>>({});
  const [roleMap, setRoleMap] = useState<Record<string, string>>({}); // name -> id
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  
  // Create draft state
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [newDraft, setNewDraft] = useState<{
    date: Date | null, 
    time: string, 
    typeId: string, 
    linkToParent?: string | false, 
    requester?: string
  }>({ 
    date: null, 
    time: '09:00', 
    typeId: '' 
  });

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Selected event modal
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);

  // Export / Print Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<'mes' | 'trimestre'>('mes');
  const [trimestreEvents, setTrimestreEvents] = useState<ChurchEvent[]>([]);
  const [trimestreParticipants, setTrimestreParticipants] = useState<Record<string, EventParticipant[]>>({});
  const [loadingExport, setLoadingExport] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentDate]); // Refetch when month changes

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

      // Calendar range
      const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
      const startDate = toDateString(days[0]);
      const endDate = toDateString(days[days.length - 1]);

      // 2. Fetch events in range
      let eventsQuery = supabase
        .from('events')
        .select('*, event_type:event_types(name, color)')
        .in('status', ['scheduled', 'draft', 'confirmed', 'completed'])
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
        
      const { data: eData } = await eventsQuery;
      
      // Filter events in memory based on eventTypesToInclude if provided
      let filteredEvents = (eData || []) as ChurchEvent[];
      if (eventTypesToInclude && eventTypesToInclude.length > 0) {
        filteredEvents = filteredEvents.filter(e => e.event_type && eventTypesToInclude.includes(e.event_type.name as string));
      } else {
        filteredEvents = filteredEvents.filter(e => e.event_type && (e.event_type.name as string).toLowerCase().includes('culto'));
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

  const fetchTrimestreData = async () => {
    setLoadingExport(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDay = new Date(year, month, 1);
      const endDay = new Date(year, month + 3, 0); // Last day of 3rd month

      const startDate = toDateString(startDay);
      const endDate = toDateString(endDay);

      const { data: eData } = await supabase
        .from('events')
        .select('*, event_type:event_types(name, color)')
        .in('status', ['scheduled', 'draft', 'confirmed', 'completed'])
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      let filtered = (eData || []) as ChurchEvent[];
      if (eventTypesToInclude && eventTypesToInclude.length > 0) {
        filtered = filtered.filter(e => e.event_type && eventTypesToInclude.includes(e.event_type.name as string));
      } else {
        filtered = filtered.filter(e => e.event_type && (e.event_type.name as string).toLowerCase().includes('culto'));
      }
      setTrimestreEvents(filtered);

      const roleIds = Object.values(roleMap);
      if (filtered.length > 0 && roleIds.length > 0) {
        const eventIds = filtered.map(e => e.id);
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
        setTrimestreParticipants(pMap);
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Erro ao carregar escala do trimestre' });
    } finally {
      setLoadingExport(false);
    }
  };

  const handleOpenExportModal = () => {
    setShowExportModal(true);
    if (exportPeriod === 'trimestre') {
      fetchTrimestreData();
    }
  };

  const handleSelectPeriod = (period: 'mes' | 'trimestre') => {
    setExportPeriod(period);
    if (period === 'trimestre' && trimestreEvents.length === 0) {
      fetchTrimestreData();
    }
  };

  const handleCreateDraft = async () => {
    if (!newDraft.date || !newDraft.typeId) {
      addToast({ type: 'error', title: 'Preencha a data e o tipo de evento' });
      return;
    }
    setLoading(true);
    try {
      const dateStr = format(newDraft.date, 'yyyy-MM-dd');
      
      let finalTime = newDraft.time;
      let finalParentId: string | null = null;

      const eventType = eventTypes.find(t => t.id === newDraft.typeId);
      const isSubEvent = eventType && !eventType.name.toLowerCase().includes('culto');
      const existingCultos = events.filter(e => e.date === dateStr && e.status !== 'draft' && e.event_type && (e.event_type as any).name.toLowerCase().includes('culto'));

      if (isSubEvent && newDraft.linkToParent !== false && existingCultos.length > 0) {
        finalParentId = newDraft.linkToParent || existingCultos[0].id;
        finalTime = existingCultos.find(c => c.id === finalParentId)?.start_time || '09:00';
      } else {
         if (!newDraft.time) {
           addToast({ type: 'error', title: 'Preencha o horário' });
           setLoading(false);
           return;
         }
      }
      
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('date', dateStr)
        .eq('start_time', finalTime)
        .eq('event_type_id', newDraft.typeId)
        .maybeSingle();
        
      if (existing) {
        addToast({ type: 'error', title: 'Já existe um evento desse tipo para esta data e horário!' });
        setLoading(false);
        return;
      }
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { error } = await supabase.from('events').insert({
        title: eventType ? `${eventType.name} (Rascunho)` : 'Culto (Rascunho)',
        date: dateStr,
        start_time: finalTime,
        event_type_id: newDraft.typeId,
        parent_event_id: finalParentId,
        status: 'draft',
        notes: newDraft.requester ? `Solicitado por: ${newDraft.requester}` : null,
        created_by: currentUser?.id || null
      });
      if (error) throw error;
      addToast({ type: 'success', title: 'Espaço de escala criado!' });
      setShowDraftModal(false);
      setNewDraft({ date: null, time: '09:00', typeId: '', linkToParent: undefined, requester: '' });
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
      setSelectedEvent(null);
      fetchData();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao excluir' });
    }
  };

  const handleAssignPerson = async (eventId: string, roleName: string, personId: string | null) => {
    const roleId = roleMap[roleName];
    if (!roleId) return;

    try {
      const existing = participants[eventId]?.find(p => p.role_id === roleId);

      if (!personId) {
        if (existing) {
          await supabase.from('event_participants').delete().eq('id', existing.id);
          addToast({ type: 'success', title: 'Escala removida' });
        }
      } else {
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
      fetchData();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao salvar escala' });
    }
  };

  const handleAddParticipant = async (eventId: string, roleId: string, personId: string) => {
    try {
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

  // Calendar Navigation
  const navigateMonth = (direction: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + direction);
    setCurrentDate(d);
  };

  const getEventsForDate = (date: Date) => events.filter(e => isSameDay(parseDate(e.date), date));

  const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Current display data for export modal
  const displayEvents = exportPeriod === 'trimestre' ? trimestreEvents : events;
  const displayParticipants = exportPeriod === 'trimestre' ? trimestreParticipants : participants;

  const handleCopyWhatsApp = () => {
    const periodLabel = exportPeriod === 'mes' 
      ? formatMonthYear(currentDate) 
      : `Trimestre (${formatMonthYear(currentDate)} a ${formatMonthYear(new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1))})`;

    let text = `📅 *${title.toUpperCase()}*\n`;
    text += `🗓️ *Período:* ${periodLabel}\n`;
    text += `🏛️ IASD Santo Afonso\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (displayEvents.length === 0) {
      text += `_Nenhum evento encontrado para o período selecionado._\n`;
    } else {
      displayEvents.forEach(ev => {
        const evParts = displayParticipants[ev.id] || [];
        const dateObj = new Date(ev.date + 'T12:00:00');
        const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
        const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        text += `📌 *${capWeekday}, ${dateStr}* às *${formatTime(ev.start_time)}* - ${ev.title}\n`;
        
        rolesToManage.forEach(rName => {
          const rId = roleMap[rName];
          const assigned = evParts.filter(p => p.role_id === rId);
          const names = assigned.map(a => a.person?.name).filter(Boolean).join(', ');
          text += `   • *${rName}:* ${names || '_A Definir_'}\n`;
        });
        text += `\n`;
      });
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Acesse a agenda completa no aplicativo da igreja._`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    addToast({ type: 'success', title: 'Escala copiada para a área de transferência!' });
  };

  const handleDownloadImage = async () => {
    const printArea = document.getElementById('escala-printable-doc');
    if (!printArea) return;
    try {
      const canvas = await html2canvas(printArea, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const periodSlug = exportPeriod === 'mes' ? formatMonthYear(currentDate) : 'Trimestre';
      link.download = `${title.replace(/\s+/g, '_')}_${periodSlug.replace(/\s+/g, '_')}.png`;
      link.href = image;
      link.click();
      addToast({ type: 'success', title: 'Imagem baixada com sucesso!' });
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Erro ao gerar imagem' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="card" style={{ padding: 0, marginBottom: 'var(--space-6)' }}>
        <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {icon}
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleOpenExportModal}>
              <Printer size={16} /> Tirar Escala (Mês / Trimestre)
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowDraftModal(true)}>
              + Criar Espaço de Escala
            </button>
          </div>
        </div>
      
        <div style={{ padding: 'var(--space-4)' }}>
          <div className="calendar-header" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="calendar-nav" style={{ flexWrap: 'wrap' }}>
              <button className="calendar-nav-btn" onClick={() => navigateMonth(-1)}>◀</button>
              <button className="calendar-nav-btn" onClick={() => setCurrentDate(new Date())}>Hoje</button>
              <button className="calendar-nav-btn" onClick={() => navigateMonth(1)}>▶</button>
              <span className="calendar-current-date" style={{ fontWeight: 600 }}>{formatMonthYear(currentDate)}</span>
            </div>
            {loading && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: 'var(--space-2)' }}>Carregando...</span>}
          </div>

          <div className="calendar-grid">
            {weekdays.map(day => (
              <div key={day} className="calendar-weekday">{day}</div>
            ))}
            {days.map((day, i) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              return (
                <div
                  key={i}
                  className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday(day) ? 'today' : ''}`}
                  style={{ minHeight: '100px' }}
                >
                  <div className="calendar-day-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="calendar-day-number">{day.getDate()}</span>
                    <button 
                      className="btn-icon" 
                      style={{ padding: '2px', color: 'var(--text-tertiary)', fontSize: '1rem', lineHeight: 1 }}
                      title="Criar Espaço de Escala neste dia"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewDraft({ date: day, time: '09:00', typeId: '', linkToParent: undefined, requester: '' });
                        setShowDraftModal(true);
                      }}
                    >
                      +
                    </button>
                  </div>
                  <div className="calendar-day-events" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {dayEvents.map(ev => {
                      const color = (ev.event_type as any)?.color || 'var(--primary)';
                      return (
                        <div
                          key={ev.id}
                          className="calendar-event-pill"
                          style={{
                            background: color,
                            color: 'white',
                            cursor: 'pointer',
                            opacity: ev.status === 'draft' ? 0.7 : 1,
                            border: ev.status === 'draft' ? '1px dashed white' : 'none'
                          }}
                          title={`${formatTime(ev.start_time)} ${ev.title}`}
                          onClick={() => setSelectedEvent(ev)}
                        >
                          <span className="hide-on-mobile" style={{ marginRight: '4px' }}>{formatTime(ev.start_time)}</span>
                          {ev.title} {ev.status === 'draft' ? '(Rascunho)' : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Event Modal */}
      {selectedEvent && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          title={`Escala: ${(selectedEvent.event_type as any)?.name || 'Evento'} - ${new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('pt-BR')}`}
        >
          <div style={{ marginBottom: 'var(--space-4)' }}>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}>
                <strong>Horário:</strong> {formatTime(selectedEvent.start_time)}
             </p>
             {selectedEvent.status === 'draft' && (
                <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--warning-light, #fff3cd)', borderRadius: 'var(--radius-md)', color: '#856404', fontSize: '0.9rem', marginBottom: 'var(--space-4)' }}>
                   Este é um espaço de rascunho. Ele não aparecerá na Agenda Geral até que seja promovido a um evento oficial.
                </div>
             )}
          </div>
          
          {/* Sub-events (e.g. Batismo) */}
          {events.filter(e => (e as any).parent_event_id === selectedEvent.id).length > 0 && (
            <div className="subevents-list" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-2)' }}>Eventos Vinculados</h4>
              {events.filter(e => (e as any).parent_event_id === selectedEvent.id).map(sub => (
                 <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px dashed var(--border-color)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                     <span>{sub.event_type?.icon || '🔹'}</span>
                     <span style={{ fontWeight: 500 }}>{sub.title}</span>
                   </div>
                   {sub.responsible_person_id && (
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                       Resp: {sub.responsible_person?.name || 'Definido'}
                     </div>
                   )}
                 </div>
               ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: '180px' }}>
            {rolesToManage.map(roleName => {
              const roleId = roleMap[roleName];
              const isMultiple = roleName.toLowerCase().includes('congregacional') || 
                                 roleName.toLowerCase().includes('grupo') || 
                                 roleName.toLowerCase().includes('diácon') || 
                                 roleName.toLowerCase().includes('diacon') || 
                                 roleName.toLowerCase().includes('professor') || 
                                 roleName.toLowerCase().includes('recepção') || 
                                 roleName.toLowerCase().includes('recepcao');
              const eventParts = participants[selectedEvent.id] || [];
              const roleAssignees = eventParts.filter(p => p.role_id === roleId);
              const currentAssignee = roleAssignees.length > 0 ? roleAssignees[0] : null;

              return (
                <div key={roleName} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>{roleName}</label>
                  
                  {isMultiple ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', border: '1px solid var(--border-color)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--background-secondary)' }}>
                      {roleAssignees.map(assignee => (
                        <div key={assignee.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--surface)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{assignee.person?.name}</span>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleRemoveParticipant(assignee.id)}
                            style={{ color: 'var(--text-danger)' }}
                            title="Remover"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div style={{ marginTop: 'var(--space-2)' }}>
                        <PersonSelect 
                          value=""
                          onChange={(personId) => personId && handleAddParticipant(selectedEvent.id, roleId, personId)}
                          placeholder="Adicionar pessoa..."
                          roleId={roleId}
                        />
                      </div>
                    </div>
                  ) : (
                    <PersonSelect 
                      value={currentAssignee?.person_id || ''}
                      onChange={(personId) => handleAssignPerson(selectedEvent.id, roleName, personId)}
                      placeholder="Definir responsável..."
                      roleId={roleId}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
            <button className="btn btn-primary" onClick={() => setSelectedEvent(null)}>Pronto</button>
          </div>
        </Modal>
      )}

      {/* Create Draft Modal */}
      <Modal 
        isOpen={showDraftModal} 
        onClose={() => setShowDraftModal(false)}
        title="Criar Espaço para Escala"
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button className="btn btn-ghost" onClick={() => setShowDraftModal(false)}>Cancelar</button>
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
              <label>2. Tipo de Evento</label>
              <select className="input" value={newDraft.typeId} onChange={e => setNewDraft({...newDraft, typeId: e.target.value})}>
                <option value="">Selecione...</option>
                {eventTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {(() => {
              const eventType = eventTypes.find(t => t.id === newDraft.typeId);
              const isSubEvent = eventType && !eventType.name.toLowerCase().includes('culto');
              const dateStr = newDraft.date ? format(newDraft.date, 'yyyy-MM-dd') : '';
              const existingCultos = events.filter(e => e.date === dateStr && e.status !== 'draft' && e.event_type && (e.event_type as any).name.toLowerCase().includes('culto'));
              
              return (
                <>
                  {isSubEvent && existingCultos.length > 0 && (
                    <div className="form-group" style={{ backgroundColor: 'var(--background-secondary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}>
                        <input 
                          type="checkbox" 
                          checked={newDraft.linkToParent !== false} 
                          onChange={e => setNewDraft({...newDraft, linkToParent: e.target.checked ? existingCultos[0].id : false})} 
                        />
                        Vincular ao {existingCultos[0].title} desse dia?
                      </label>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px', paddingLeft: '24px' }}>
                        O horário será puxado automaticamente do culto.
                      </div>
                    </div>
                  )}

                  {(!isSubEvent || existingCultos.length === 0 || newDraft.linkToParent === false) && (
                    <div className="form-group">
                      <label>3. Horário do Evento</label>
                      <input type="time" className="input" value={newDraft.time} onChange={e => setNewDraft({...newDraft, time: e.target.value})} />
                    </div>
                  )}
                </>
              );
            })()}

            <div className="form-group">
              <label>Quem solicitou? (Opcional)</label>
              <input type="text" className="input" placeholder="Ex: Pr. João, Joãozinho" value={newDraft.requester || ''} onChange={e => setNewDraft({...newDraft, requester: e.target.value})} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Tirar Escala (Print / Export Modal) */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={`Tirar Escala — ${title}`}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                className={`btn btn-sm ${exportPeriod === 'mes' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleSelectPeriod('mes')}
              >
                📅 Mês Atual
              </button>
              <button 
                className={`btn btn-sm ${exportPeriod === 'trimestre' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleSelectPeriod('trimestre')}
              >
                🗓️ Trimestre (3 Meses)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleCopyWhatsApp}>
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiado!' : 'Copiar p/ WhatsApp'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleDownloadImage}>
                <Download size={16} /> Baixar Imagem (PNG)
              </button>
              <button className="btn btn-primary btn-sm" onClick={handlePrint}>
                <Printer size={16} /> Imprimir / PDF
              </button>
            </div>
          </div>
        }
      >
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #escala-printable-doc, #escala-printable-doc * {
              visibility: visible !important;
            }
            #escala-printable-doc {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              margin: 0 !important;
              padding: 20px !important;
              border: none !important;
              box-shadow: none !important;
              z-index: 999999 !important;
              background: white !important;
              color: black !important;
            }
          }
        `}</style>

        <div style={{ marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Exibindo escala com o nome dos voluntários escalados:
          </span>
          {loadingExport && <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Carregando trimestre...</span>}
        </div>

        <div 
          id="escala-printable-doc" 
          style={{ 
            backgroundColor: '#ffffff', 
            color: '#111827', 
            padding: '24px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb',
            maxHeight: '60vh',
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #2563eb', paddingBottom: '12px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#1e3a8a' }}>{title}</h2>
              <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: '0.95rem', fontWeight: 600 }}>
                {exportPeriod === 'mes' 
                  ? formatMonthYear(currentDate) 
                  : `Trimestre: ${formatMonthYear(currentDate)} a ${formatMonthYear(new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1))}`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>IASD Santo Afonso</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Gestão de Escalas</div>
            </div>
          </div>

          {displayEvents.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>Nenhum evento encontrado no período.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: '#334155' }}>Data</th>
                    <th style={{ padding: '10px 12px', color: '#334155', width: '70px' }}>Horário</th>
                    <th style={{ padding: '10px 12px', color: '#334155' }}>Culto / Programação</th>
                    {rolesToManage.map(rName => (
                      <th key={rName} style={{ padding: '10px 12px', color: '#334155' }}>{rName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayEvents.map((ev, idx) => {
                    const evParts = displayParticipants[ev.id] || [];
                    const dateObj = new Date(ev.date + 'T12:00:00');
                    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
                    const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                    const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    
                    return (
                      <tr key={ev.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 700, whiteSpace: 'nowrap', color: '#0f172a' }}>
                          {capWeekday}, {dateStr}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {formatTime(ev.start_time)}
                        </td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>
                          {ev.title} {ev.status === 'draft' ? '(Rascunho)' : ''}
                        </td>
                        {rolesToManage.map(rName => {
                          const rId = roleMap[rName];
                          const parts = evParts.filter(p => p.role_id === rId);
                          const names = parts.map(p => p.person?.name).filter(Boolean).join(', ');
                          return (
                            <td key={rName} style={{ padding: '10px 12px' }}>
                              {names ? (
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{names}</span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>A Definir</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
