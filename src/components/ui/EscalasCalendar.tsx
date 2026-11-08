'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChurchEvent, EventParticipant } from '@/lib/types';
import { useToast } from '@/lib/hooks/useToast';
import PersonSelect from './PersonSelect';
import Modal from './Modal';
import { Printer, Download, Copy, Check, Calendar as CalendarIcon, List, Clock, UserCheck } from 'lucide-react';
import html2canvas from 'html2canvas';
import {
  getMonthDays, isToday, isSameDay, formatMonthYear, toDateString, parseDate
} from '@/lib/utils/dates';
import { formatTime } from '@/lib/utils/liturgy-calculator';

const safeFormatTime = (time: string | null | undefined) => {
  if (!time) return '--:--';
  return formatTime(time);
};

interface EscalasCalendarProps {
  title: string;
  icon: React.ReactNode;
  eventTypesToInclude?: string[];
  rolesToManage: string[];
}

const ROLE_CONFIG: Record<string, { aliases: string[]; isMultiple: boolean }> = {
  'Diácono / Diaconisa': {
    aliases: ['Diácono / Diaconisa', 'Diácono/Diaconisa', 'Diácono', 'Diaconisa'],
    isMultiple: true
  },
  'Diácono/Diaconisa': {
    aliases: ['Diácono / Diaconisa', 'Diácono/Diaconisa', 'Diácono', 'Diaconisa'],
    isMultiple: true
  },
  'Abertura da Escola Sabatina': {
    aliases: ['Abertura da Escola Sabatina', 'Escola Sabatina', 'Abertura'],
    isMultiple: false
  },
  'Pregador(a)': {
    aliases: ['Pregador(a)', 'Pregador'],
    isMultiple: false
  },
  'Sonoplasta': {
    aliases: ['Sonoplasta'],
    isMultiple: false
  },
  'Líder de Louvor': {
    aliases: ['Líder de Louvor'],
    isMultiple: false
  },
  'Cantor(a) Solo': {
    aliases: ['Cantor(a) Solo', 'Cantor'],
    isMultiple: false
  },
  'Cantor(a) Congregacional': {
    aliases: ['Cantor(a) Congregacional'],
    isMultiple: true
  }
};

export default function EscalasCalendar({ title, icon, eventTypesToInclude, rolesToManage }: EscalasCalendarProps) {
  const supabase = createClient();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [participants, setParticipants] = useState<Record<string, EventParticipant[]>>({});
  
  // Mapping: managedRole -> primaryRoleId (used for new inserts)
  const [primaryRoleMap, setPrimaryRoleMap] = useState<Record<string, string>>({});
  // Mapping: managedRole -> all matching role IDs (used for querying and filtering)
  const [aliasRoleMap, setAliasRoleMap] = useState<Record<string, string[]>>({});

  // View state: 'lista' (default, perfect for mobile) or 'calendario'
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('lista');

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Selected event modal for assigning
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
  }, [currentDate, rolesToManage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch role IDs for all aliases of rolesToManage
      const allAliases = Array.from(new Set(rolesToManage.flatMap(r => ROLE_CONFIG[r]?.aliases || [r])));
      const { data: rolesData } = await supabase
        .from('roles')
        .select('id, name')
        .in('name', allAliases);

      const pMap: Record<string, string> = {};
      const aMap: Record<string, string[]> = {};
      const allQueryRoleIds: string[] = [];

      rolesToManage.forEach(mRole => {
        const aliases = ROLE_CONFIG[mRole]?.aliases || [mRole];
        const matching = (rolesData || []).filter(r => aliases.some(a => a.toLowerCase() === r.name.toLowerCase()));
        
        // Primary role: exact match preferred, otherwise first match
        const exact = matching.find(r => r.name.toLowerCase() === mRole.toLowerCase());
        const primary = exact || matching[0];
        if (primary) pMap[mRole] = primary.id;

        const ids = matching.map(r => r.id);
        aMap[mRole] = ids;
        ids.forEach(id => {
          if (!allQueryRoleIds.includes(id)) allQueryRoleIds.push(id);
        });
      });

      setPrimaryRoleMap(pMap);
      setAliasRoleMap(aMap);

      // Calendar range
      const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
      const startDate = toDateString(days[0]);
      const endDate = toDateString(days[days.length - 1]);

      // 2. Fetch events in range
      let eventsQuery = supabase
        .from('events')
        .select('*, event_type:event_types(name, color)')
        .in('status', ['scheduled', 'confirmed', 'completed'])
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
        
      const { data: eData } = await eventsQuery;
      
      let filteredEvents = (eData || []) as ChurchEvent[];
      if (eventTypesToInclude && eventTypesToInclude.length > 0) {
        filteredEvents = filteredEvents.filter(e => e.event_type && eventTypesToInclude.includes(e.event_type.name as string));
      } else {
        filteredEvents = filteredEvents.filter(e => e.event_type && (e.event_type.name as string).toLowerCase().includes('culto'));
      }
      setEvents(filteredEvents);

      // 3. Fetch participants for these events
      if (filteredEvents.length > 0 && allQueryRoleIds.length > 0) {
        const eventIds = filteredEvents.map(e => e.id);
        
        const { data: pData } = await supabase
          .from('event_participants')
          .select('*, person:people(id, name, whatsapp)')
          .in('event_id', eventIds)
          .in('role_id', allQueryRoleIds);

        const partMap: Record<string, EventParticipant[]> = {};
        pData?.forEach(p => {
          if (!partMap[p.event_id]) partMap[p.event_id] = [];
          partMap[p.event_id].push(p as EventParticipant);
        });
        setParticipants(partMap);
      } else {
        setParticipants({});
      }

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
        .in('status', ['scheduled', 'confirmed', 'completed'])
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

      const allQueryRoleIds = Array.from(new Set(Object.values(aliasRoleMap).flat()));
      if (filtered.length > 0 && allQueryRoleIds.length > 0) {
        const eventIds = filtered.map(e => e.id);
        const { data: pData } = await supabase
          .from('event_participants')
          .select('*, person:people(id, name, whatsapp)')
          .in('event_id', eventIds)
          .in('role_id', allQueryRoleIds);

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

  const handleAssignPerson = async (eventId: string, managedRole: string, personId: string | null) => {
    const roleId = primaryRoleMap[managedRole];
    const aliasIds = aliasRoleMap[managedRole] || [];
    if (!roleId && aliasIds.length === 0) return;

    try {
      const existing = participants[eventId]?.find(p => Boolean(p.role_id && aliasIds.includes(p.role_id)));

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
            role_id: roleId || aliasIds[0],
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

  const handleAddParticipant = async (eventId: string, managedRole: string, personId: string) => {
    const roleId = primaryRoleMap[managedRole] || (aliasRoleMap[managedRole] || [])[0];
    const aliasIds = aliasRoleMap[managedRole] || [];
    if (!roleId) return;

    try {
      const existing = participants[eventId]?.find(p => Boolean(p.role_id && aliasIds.includes(p.role_id)) && p.person_id === personId);
      if (existing) return;
      
      await supabase.from('event_participants').insert({
        event_id: eventId,
        role_id: roleId,
        person_id: personId
      });
      addToast({ type: 'success', title: 'Voluntário adicionado!' });
      fetchData();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao adicionar voluntário' });
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

  const getAssignedPeople = (eventId: string, managedRole: string, pSource: Record<string, EventParticipant[]> = participants) => {
    const aliasIds = aliasRoleMap[managedRole] || [];
    return (pSource[eventId] || []).filter(p => Boolean(p.role_id && aliasIds.includes(p.role_id)));
  };

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
      text += `_Nenhum culto encontrado para o período selecionado._\n`;
    } else {
      displayEvents.forEach(ev => {
        const dateObj = new Date(ev.date + 'T12:00:00');
        const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
        const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
        const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        text += `📌 *${capWeekday}, ${dateStr}* às *${safeFormatTime(ev.start_time)}* - ${ev.title}\n`;
        
        rolesToManage.forEach(mRole => {
          const assigned = getAssignedPeople(ev.id, mRole, displayParticipants);
          const names = assigned.map(a => a.person?.name).filter(Boolean).join(', ');
          text += `   • *${mRole}:* ${names || '_A Definir_'}\n`;
        });
        text += `\n`;
      });
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Escala gerada pela Central Santo Afonso_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    addToast({ type: 'success', title: 'Escala copiada para o WhatsApp!' });
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

  return (
    <>
      <div className="card" style={{ padding: 0, marginBottom: 'var(--space-6)', overflow: 'hidden' }}>
        {/* Card Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icon}
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{title}</h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* View Mode Toggle: Lista vs Calendário */}
            <div style={{ display: 'flex', background: 'var(--background-secondary)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
              <button 
                className={`btn btn-sm ${viewMode === 'lista' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('lista')}
                style={{ fontSize: '0.8rem', padding: '4px 10px', height: '32px' }}
                title="Visualização em Lista"
              >
                <List size={15} style={{ marginRight: '4px' }} /> Lista
              </button>
              <button 
                className={`btn btn-sm ${viewMode === 'calendario' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('calendario')}
                style={{ fontSize: '0.8rem', padding: '4px 10px', height: '32px' }}
                title="Visualização em Grade Mensal"
              >
                <CalendarIcon size={15} style={{ marginRight: '4px' }} /> Mês
              </button>
            </div>

            {/* Tirar Escala Button */}
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handleOpenExportModal}
              style={{ height: '32px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <Printer size={15} /> Tirar Escala
            </button>
          </div>
        </div>
      
        <div style={{ padding: '16px' }}>
          {/* Navigation Month */}
          <div className="calendar-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="calendar-nav" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button className="calendar-nav-btn" onClick={() => navigateMonth(-1)}>◀</button>
              <button className="calendar-nav-btn" onClick={() => setCurrentDate(new Date())}>Hoje</button>
              <button className="calendar-nav-btn" onClick={() => navigateMonth(1)}>▶</button>
              <span className="calendar-current-date" style={{ fontWeight: 700, marginLeft: '6px', fontSize: '1.05rem' }}>
                {formatMonthYear(currentDate)}
              </span>
            </div>
            {loading && <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Carregando...</span>}
          </div>

          {/* VIEW 1: LIST VIEW (Ideal for Mobile and Quick Scaling) */}
          {viewMode === 'lista' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  Nenhum culto programado para {formatMonthYear(currentDate)}.
                </div>
              ) : (
                events.map(ev => {
                  const dateObj = new Date(ev.date + 'T12:00:00');
                  const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
                  const dayNum = dateObj.getDate();
                  const isCurrentDay = isToday(dateObj);

                  return (
                    <div 
                      key={ev.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        backgroundColor: isCurrentDay ? 'rgba(37, 99, 235, 0.05)' : 'var(--surface)',
                        border: isCurrentDay ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        gap: '12px',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Date Block */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '54px',
                        height: '54px',
                        backgroundColor: isCurrentDay ? 'var(--primary)' : 'var(--background-secondary)',
                        color: isCurrentDay ? '#ffffff' : 'var(--text)',
                        borderRadius: '8px',
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.9 }}>
                          {weekday}
                        </span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, lineHeight: 1 }}>
                          {dayNum}
                        </span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.8 }}>
                          {safeFormatTime(ev.start_time)}
                        </span>
                      </div>

                      {/* Event & Assigned Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
                          {ev.title}
                        </div>
                        <div style={{ marginTop: '4px', fontSize: '0.85rem' }}>
                          {rolesToManage.map(mRole => {
                            const assigned = getAssignedPeople(ev.id, mRole);
                            const names = assigned.map(a => a.person?.name).filter(Boolean).join(', ');
                            return (
                              <div key={mRole} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{mRole}:</span>
                                {names ? (
                                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{names}</span>
                                ) : (
                                  <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>A Definir</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Escalar Button */}
                      <button 
                        className="btn btn-secondary btn-sm"
                        style={{ alignSelf: 'center', whiteSpace: 'nowrap', borderRadius: '16px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                        onClick={() => setSelectedEvent(ev)}
                      >
                        ✏️ Escalar
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* VIEW 2: CALENDAR GRID */
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
                    style={{ minHeight: '85px', padding: '4px' }}
                  >
                    <div className="calendar-day-header" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                      <span className="calendar-day-number" style={{ fontWeight: 600 }}>{day.getDate()}</span>
                    </div>
                    <div className="calendar-day-events" style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '3px' }}>
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
                              padding: '2px 4px',
                              fontSize: '0.75rem',
                              borderRadius: '4px'
                            }}
                            title={`${safeFormatTime(ev.start_time)} ${ev.title}`}
                            onClick={() => setSelectedEvent(ev)}
                          >
                            <span style={{ fontWeight: 600, marginRight: '3px' }}>{safeFormatTime(ev.start_time)}</span>
                            {ev.title}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Event Modal (Assign Volunteers) */}
      {selectedEvent && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          title={`Escala: ${(selectedEvent.event_type as any)?.name || 'Culto'} - ${new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString('pt-BR')}`}
        >
          <div style={{ marginBottom: 'var(--space-4)' }}>
             <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                <strong>Horário do Culto:</strong> {safeFormatTime(selectedEvent.start_time)}
             </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: '160px' }}>
            {rolesToManage.map(mRole => {
              const isMultiple = ROLE_CONFIG[mRole]?.isMultiple ?? false;
              const roleAssignees = getAssignedPeople(selectedEvent.id, mRole);
              const currentAssignee = roleAssignees.length > 0 ? roleAssignees[0] : null;
              const filterRoleIds = aliasRoleMap[mRole] || [];

              return (
                <div key={mRole} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>{mRole}</label>
                  
                  {isMultiple ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      border: '1px solid var(--border-color)',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--background-secondary)'
                    }}>
                      {roleAssignees.map(assignee => (
                        <div 
                          key={assignee.id} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'var(--surface)',
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{assignee.person?.name}</span>
                          <button 
                            className="btn-icon" 
                            onClick={() => handleRemoveParticipant(assignee.id)}
                            style={{ color: 'var(--text-danger)', fontSize: '1.2rem', lineHeight: 1, padding: '2px 6px' }}
                            title="Remover"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div style={{ marginTop: '4px' }}>
                        <PersonSelect 
                          value=""
                          onChange={(personId) => personId && handleAddParticipant(selectedEvent.id, mRole, personId)}
                          placeholder="Adicionar voluntário(a)..."
                          roleId={filterRoleIds}
                        />
                      </div>
                    </div>
                  ) : (
                    <PersonSelect 
                      value={currentAssignee?.person_id || ''}
                      onChange={(personId) => handleAssignPerson(selectedEvent.id, mRole, personId)}
                      placeholder="Definir responsável..."
                      roleId={filterRoleIds}
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
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copiado!' : 'Copiar p/ WhatsApp'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleDownloadImage}>
                <Download size={15} /> Baixar Imagem
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                <Printer size={15} /> Imprimir / PDF
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

        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Visualização da escala com o nome dos voluntários:
          </span>
          {loadingExport && <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Carregando trimestre...</span>}
        </div>

        <div 
          id="escala-printable-doc" 
          style={{ 
            backgroundColor: '#ffffff', 
            color: '#111827', 
            padding: '20px', 
            borderRadius: '8px', 
            border: '1px solid #e5e7eb',
            maxHeight: '60vh',
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #2563eb', paddingBottom: '12px', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1e3a8a' }}>{title}</h2>
              <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: '0.9rem', fontWeight: 600 }}>
                {exportPeriod === 'mes' 
                  ? formatMonthYear(currentDate) 
                  : `Trimestre: ${formatMonthYear(currentDate)} a ${formatMonthYear(new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1))}`}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e40af' }}>IASD Santo Afonso</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Gestão de Escalas</div>
            </div>
          </div>

          {displayEvents.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>Nenhum culto encontrado no período.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', color: '#334155', width: '110px' }}>Data</th>
                    <th style={{ padding: '8px 10px', color: '#334155', width: '65px' }}>Horário</th>
                    <th style={{ padding: '8px 10px', color: '#334155' }}>Culto / Programação</th>
                    {rolesToManage.map(mRole => (
                      <th key={mRole} style={{ padding: '8px 10px', color: '#334155' }}>{mRole}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayEvents.map((ev, idx) => {
                    const dateObj = new Date(ev.date + 'T12:00:00');
                    const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
                    const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
                    const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    
                    return (
                      <tr key={ev.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700, whiteSpace: 'nowrap', color: '#0f172a' }}>
                          {capWeekday}, {dateStr}
                        </td>
                        <td style={{ padding: '8px 10px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {safeFormatTime(ev.start_time)}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>
                          {ev.title}
                        </td>
                        {rolesToManage.map(mRole => {
                          const assigned = getAssignedPeople(ev.id, mRole, displayParticipants);
                          const names = assigned.map(a => a.person?.name).filter(Boolean).join(', ');
                          return (
                            <td key={mRole} style={{ padding: '8px 10px' }}>
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
