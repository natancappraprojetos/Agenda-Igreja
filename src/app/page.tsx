'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import Link from 'next/link';
import type { ChurchEvent, CalendarView } from '@/lib/types';
import PersonSelect from '@/components/ui/PersonSelect';
import {
  getMonthDays, getWeekDays, isToday, isSameDay,
  formatMonthYear, getWeekdayShort, getWeekdayName,
  formatDayMonth, toDateString, parseDate, formatDateShort,
} from '@/lib/utils/dates';
import { formatTime } from '@/lib/utils/liturgy-calculator';

export default function AgendaPage() {
  const [view, setView] = useState<CalendarView>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [eventParticipants, setEventParticipants] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [addingExtraRole, setAddingExtraRole] = useState(false);
  const [newExtraRoleId, setNewExtraRoleId] = useState('');
  
  const supabase = createClient();
  const { user, isLeadership, roles } = useAuth();
  const { addToast } = useToast();

  const fetchExtraParticipants = useCallback(async (eventId: string) => {
    const { data: epData } = await supabase
      .from('event_participants')
      .select('*, role:roles(*), person:people(*)')
      .eq('event_id', eventId);
    if (epData) setEventParticipants(epData);
    
    const { data: rolesData } = await supabase.from('roles').select('*').order('name');
    if (rolesData) setAvailableRoles(rolesData);
  }, [supabase]);

  useEffect(() => {
    if (selectedEvent) {
      fetchExtraParticipants(selectedEvent.id);
    }
  }, [selectedEvent?.id, fetchExtraParticipants]);

  const handleUpdateRole = async (eventId: string, field: string, personId: string | null) => {
    try {
      const { error } = await supabase.from('events').update({ [field]: personId }).eq('id', eventId);
      if (error) throw error;
      
      const { data } = await supabase
        .from('events')
        .select(`
          *,
          event_type:event_types(*),
          location:locations(*),
          preacher:people!events_preacher_id_fkey(*),
          worship_leader:people!events_worship_leader_id_fkey(*),
          sound_person:people!events_sound_person_id_fkey(*),
          responsible_person:people!events_responsible_person_id_fkey(*)
        `)
        .eq('id', eventId)
        .single();
        
      if (data) {
        setSelectedEvent(data as ChurchEvent);
        setEvents(prev => prev.map(e => e.id === eventId ? (data as ChurchEvent) : e));
        addToast({ type: 'success', title: 'Salvo com sucesso' });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Erro ao atualizar' });
    }
  };

  const handleUpdateExtraRole = async (epId: string | undefined, eventId: string, roleId: string, personId: string | null) => {
    try {
      if (!personId && epId) {
        // Delete
        await supabase.from('event_participants').delete().eq('id', epId);
      } else if (personId && !epId) {
        // Insert
        await supabase.from('event_participants').insert({ event_id: eventId, role_id: roleId, person_id: personId });
      } else if (personId && epId) {
        // Update
        await supabase.from('event_participants').update({ person_id: personId }).eq('id', epId);
      }
      
      await fetchExtraParticipants(eventId);
      addToast({ type: 'success', title: 'Função atualizada com sucesso' });
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Erro ao atualizar função' });
    }
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;

      if (view === 'month') {
        const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
        startDate = toDateString(days[0]);
        endDate = toDateString(days[days.length - 1]);
      } else if (view === 'week') {
        const days = getWeekDays(currentDate);
        startDate = toDateString(days[0]);
        endDate = toDateString(days[6]);
      } else {
        startDate = toDateString(currentDate);
        endDate = toDateString(currentDate);
      }

      const { data } = await supabase
        .from('events')
        .select(`
          *,
          event_type:event_types(*),
          location:locations(*),
          preacher:people!events_preacher_id_fkey(*),
          worship_leader:people!events_worship_leader_id_fkey(*),
          sound_person:people!events_sound_person_id_fkey(*),
          responsible_person:people!events_responsible_person_id_fkey(*),
          participants:event_participants(role:roles(name), person:people(name, id))
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .in('status', ['scheduled', 'confirmed', 'completed'])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      setEvents((data || []) as unknown as ChurchEvent[]);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate, view, supabase]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const navigate = (direction: number) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + direction);
    else if (view === 'week') d.setDate(d.getDate() + 7 * direction);
    else d.setDate(d.getDate() + direction);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const getEventsForDate = (date: Date) =>
    events
      .filter(e => isSameDay(parseDate(e.date), date))
      .sort((a, b) => {
        // Comissão sempre no topo, independente do horário
        const aIsComissao = a.event_type?.name?.toLowerCase().includes('comissão');
        const bIsComissao = b.event_type?.name?.toLowerCase().includes('comissão');
        if (aIsComissao && !bIsComissao) return -1;
        if (bIsComissao && !aIsComissao) return 1;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

  const getDateLabel = () => {
    if (view === 'month') return formatMonthYear(currentDate);
    if (view === 'week') {
      const days = getWeekDays(currentDate);
      return `${formatDayMonth(days[0])} — ${formatDayMonth(days[6])}`;
    }
    return `${getWeekdayName(currentDate)}, ${formatDateShort(currentDate)}`;
  };

  const renderEventCard = (event: ChurchEvent) => {
    const borderColor = event.event_type?.color || 'var(--primary)';
    return (
      <div
        key={event.id}
        className="event-card"
        style={{ borderLeftColor: borderColor }}
        onClick={() => setSelectedEvent(event)}
      >
        <div className="event-card-time">
          {formatTime(event.start_time)}
        </div>
        <div className="event-card-content">
          <div className="event-card-title">
            {event.event_type?.icon} {event.title}
          </div>
          <div className="event-card-info">
            {event.preacher && (
              <span className="event-card-info-item">
                🎤 {event.preacher.name}
              </span>
            )}
            {event.location && (
              <span className="event-card-info-item">
                📍 {event.location.name}
              </span>
            )}
            {event.worship_leader && (
              <span className="event-card-info-item">
                🎵 {event.worship_leader.name}
              </span>
            )}
          </div>
          {isLeadership && (
            <div className="event-card-status">
              {(() => {
                const hasPreacherParticipant = event.participants?.some(p => p.role?.name?.toLowerCase().includes('pregador'));
                return (event.preacher || hasPreacherParticipant) ? (
                  <span className="badge badge-success">✅ Pregador</span>
                ) : event.event_type?.name === 'Culto' ? (
                  <span className="badge badge-danger">❌ Pregador</span>
                ) : null;
              })()}
              {(() => {
                const hasSoundParticipant = event.participants?.some(p => p.role?.name?.toLowerCase().includes('sonoplasta'));
                return event.needs_sound && !(event.sound_person || hasSoundParticipant) ? (
                  <span className="badge badge-warning">⚠️ Sonoplastia</span>
                ) : event.needs_sound && (event.sound_person || hasSoundParticipant) ? (
                  <span className="badge badge-success">✅ Sonoplastia</span>
                ) : null;
              })()}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
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
              onClick={() => {
                setCurrentDate(day);
                setView('day');
              }}
            >
              <div className="calendar-day-header" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '4px', width: '100%' }}>
                <span className="calendar-day-number">{day.getDate()}</span>
                <Link
                  href={`/agendar?date=${toDateString(day)}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '1.2rem', lineHeight: 1, fontWeight: 'bold' }}
                  title="Agendar Evento"
                >
                  +
                </Link>
              </div>
              <div className="calendar-day-events">
                {dayEvents.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    className="calendar-event-pill"
                    style={{
                      background: ev.event_type?.color || 'var(--primary)',
                      color: 'white',
                    }}
                    title={`${formatTime(ev.start_time)} ${ev.title}`}
                  >
                    <span className="hide-on-mobile">{formatTime(ev.start_time)} </span>{ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="calendar-event-pill" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    +{dayEvents.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const days = getWeekDays(currentDate);

    return (
      <div className="calendar-list">
        {days.map(day => {
          const dayEvents = getEventsForDate(day);
          return (
            <div key={day.toISOString()} className={`calendar-list-day ${isToday(day) ? 'today' : ''}`}>
              <div className="calendar-list-day-header">
                <span className="calendar-list-day-name">{getWeekdayShort(day)}</span>
                <span className="calendar-list-day-date">{day.getDate()}</span>
              </div>
              <div className="calendar-list-events">
                {dayEvents.length === 0 ? (
                  <div className="calendar-list-empty">Nenhum evento</div>
                ) : (
                  dayEvents.map(renderEventCard)
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    const dayEvents = getEventsForDate(currentDate);

    return (
      <div className="calendar-list">
        <div className={`calendar-list-day ${isToday(currentDate) ? 'today' : ''}`}>
          <div className="calendar-list-day-header">
            <span className="calendar-list-day-name">{getWeekdayName(currentDate)}</span>
            <span className="calendar-list-day-date">
              {currentDate.getDate()} de {formatMonthYear(currentDate)}
            </span>
          </div>
          <div className="calendar-list-events">
            {dayEvents.length === 0 ? (
              <div className="calendar-list-empty">
                <div className="empty-state">
                  <div className="empty-state-icon">📅</div>
                  <div className="empty-state-title">Nenhum evento</div>
                  <div className="empty-state-description">
                    Não há eventos programados para este dia.
                  </div>
                  <Link href={`/agendar?date=${toDateString(currentDate)}`} className="btn btn-primary">
                    ➕ Criar Evento
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {dayEvents.map(renderEventCard)}
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
                  <Link href={`/agendar?date=${toDateString(currentDate)}`} className="btn btn-outline" style={{ width: '100%' }}>
                    ➕ Adicionar evento neste dia
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header Público */}
      <header style={{ 
        backgroundColor: 'var(--surface)', 
        padding: 'var(--space-2) var(--space-4)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="login-logo" style={{ overflow: 'hidden', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo-azul.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 className="hide-on-mobile" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Central Santo Afonso
          </h1>
        </div>
        {user ? (
          <Link href="/minha-agenda" className="btn btn-primary btn-sm" style={{ fontWeight: 600 }}>
            Painel ADM ⚙️
          </Link>
        ) : (
          <Link href="/login" className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }}>
            Login 👤
          </Link>
        )}
      </header>
      <div className="app-content">
        <div className="calendar-header" style={{ gap: 'var(--space-2)' }}>
          <div className="calendar-nav" style={{ flexWrap: 'wrap' }}>
            <button className="calendar-nav-btn" onClick={() => navigate(-1)} aria-label="Anterior">
              ◀
            </button>
            <button className="calendar-nav-btn" onClick={goToday}>
              Hoje
            </button>
            <button className="calendar-nav-btn" onClick={() => navigate(1)} aria-label="Próximo">
              ▶
            </button>
            <span className="calendar-current-date">{getDateLabel()}</span>
          </div>

          <div className="calendar-view-toggle">
            <button
              className={`calendar-view-btn ${view === 'month' ? 'active' : ''}`}
              onClick={() => setView('month')}
            >
              Mês
            </button>
            <button
              className={`calendar-view-btn ${view === 'week' ? 'active' : ''}`}
              onClick={() => setView('week')}
            >
              Semana
            </button>
            <button
              className={`calendar-view-btn ${view === 'day' ? 'active' : ''}`}
              onClick={() => setView('day')}
            >
              Dia
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-page">
            <div className="spinner spinner-lg" />
            <span className="loading-text">Carregando agenda...</span>
          </div>
        ) : (
          <>
            {view === 'month' && renderMonthView()}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}
          </>
        )}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="modal-backdrop" onClick={() => setSelectedEvent(null)}>
            <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">
                  {selectedEvent.event_type?.icon} {selectedEvent.title}
                </h2>
                <button className="modal-close" onClick={() => setSelectedEvent(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="review-grid">
                  <div className="review-section">
                    <div className="review-label">Data</div>
                    <div className="review-value">{formatDateShort(selectedEvent.date)}</div>
                  </div>
                  <div className="review-section">
                    <div className="review-label">Horário</div>
                    <div className="review-value">
                      {formatTime(selectedEvent.start_time)}
                      {selectedEvent.end_time && ` — ${formatTime(selectedEvent.end_time)}`}
                    </div>
                  </div>
                  <div className="review-section">
                    <div className="review-label">Local</div>
                    <div className="review-value">
                      {selectedEvent.location?.name || '—'}
                    </div>
                  </div>
                  <div className="review-section">
                    <div className="review-label">Tipo</div>
                    <div className="review-value">
                      <span className="badge badge-primary">
                        {selectedEvent.event_type?.icon} {selectedEvent.event_type?.name}
                      </span>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: 'var(--space-4) 0' }} />

                {(() => {
                  const isCulto = selectedEvent.event_type?.name?.toLowerCase().includes('culto');
                  const getPersonInfo = (colValId: any, colValPerson: any, roleNames: string[]) => {
                    if (colValId) return { id: colValId, name: colValPerson?.name };
                    const p = eventParticipants.find(p => roleNames.some(rn => p.role?.name?.toLowerCase().includes(rn.toLowerCase())));
                    return p ? { id: p.person_id, name: p.person?.name } : { id: '', name: '' };
                  };
                  
                  const soundPerson = getPersonInfo(selectedEvent.sound_person_id, selectedEvent.sound_person, ['sonoplasta', 'sonoplastia']);
                  const preacher = getPersonInfo(selectedEvent.preacher_id, selectedEvent.preacher, ['pregador']);
                  const worship = getPersonInfo(selectedEvent.worship_leader_id, selectedEvent.worship_leader, ['líder de louvor', 'música', 'louvor']);
                  const responsible = getPersonInfo(selectedEvent.responsible_person_id, selectedEvent.responsible_person, ['responsável']);

                  const renderField = (label: string, personInfo: { id: string, name: string }, fieldId: string) => (
                    <div className="review-section" style={{ overflow: 'visible' }}>
                      <div className="review-label">{label}</div>
                      <div className="review-value">
                        {user ? (
                          <PersonSelect 
                            value={personInfo.id} 
                            onChange={(val) => handleUpdateRole(selectedEvent.id, fieldId, val)} 
                            placeholder="Definir..." 
                          />
                        ) : (
                          <span style={{ fontWeight: 500, color: personInfo.name ? 'inherit' : 'var(--text-tertiary)' }}>
                            {personInfo.name || 'A Definir...'}
                          </span>
                        )}
                      </div>
                    </div>
                  );

                  return (
                    <div className="review-grid">
                      {(isCulto || soundPerson.id) && renderField('🔊 Sonoplastia', soundPerson, 'sound_person_id')}
                      {(isCulto || preacher.id) && renderField('🎤 Pregador', preacher, 'preacher_id')}
                      {(isCulto || worship.id) && renderField('🎵 Louvor', worship, 'worship_leader_id')}
                      {renderField('👤 Responsável', responsible, 'responsible_person_id')}
                    </div>
                  );
                })()}

                {/* FUNÇÕES EXTRAS (LITURGIA/ESCALAS) */}
                {(() => {
                  
                  const isSabado = selectedEvent.title.toLowerCase().includes('sáb') || selectedEvent.title.toLowerCase().includes('sabado');
                  const baseVirtualRoles = isSabado ? ['Escola Sabatina', 'História das Crianças', 'Ofertas', 'Anúncios'] : [];
                  
                  const displayedRoles: any[] = [];
                  const standardRoles = ['Pregador', 'Pregador(a)', 'Ancião', 'Diácono', 'Diaconisa', 'Diácono/Diaconisa', 'Sonoplasta', 'Cantor', 'Líder de Louvor', 'Instrumentista', 'Pianista', 'Violonista', 'Cantor(a) Solo', 'Cantor(a) Congregacional', 'Responsável', 'Diretor'];

                  baseVirtualRoles.forEach(vr => {
                     const ep = eventParticipants.find(p => p.role?.name === vr);
                     if (ep) {
                         displayedRoles.push({ roleName: vr, roleId: ep.role_id, personId: ep.person_id, personName: ep.person?.name, epId: ep.id });
                     } else {
                         const roleObj = availableRoles.find(r => r.name === vr);
                         displayedRoles.push({ roleName: vr, roleId: roleObj?.id });
                     }
                  });

                  eventParticipants.forEach(ep => {
                     if (!standardRoles.includes(ep.role?.name) && !baseVirtualRoles.includes(ep.role?.name)) {
                         displayedRoles.push({ roleName: ep.role?.name, roleId: ep.role_id, personId: ep.person_id, personName: ep.person?.name, epId: ep.id });
                     }
                  });
                  
                  // If not authenticated, only show the non-empty virtual roles or standard roles as text, don't allow edits
                  if (!user) {
                    const populatedRoles = displayedRoles.filter(dr => dr.personName);
                    if (populatedRoles.length === 0) return null;
                    return (
                      <div className="review-grid" style={{ marginTop: 'var(--space-2)' }}>
                        {populatedRoles.map((dr, idx) => (
                          <div key={idx} className="review-section">
                            <div className="review-label">✨ {dr.roleName}</div>
                            <div className="review-value">
                              <span style={{ fontWeight: 500 }}>{dr.personName}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <>
                      {displayedRoles.length > 0 && (
                        <div className="review-grid" style={{ marginTop: 'var(--space-2)' }}>
                          {displayedRoles.map((dr, idx) => (
                            <div key={idx} className="review-section" style={{ overflow: 'visible' }}>
                              <div className="review-label">✨ {dr.roleName}</div>
                              <div className="review-value">
                                {dr.roleId ? (
                                  <PersonSelect 
                                    value={dr.personId || ''} 
                                    onChange={(val) => handleUpdateExtraRole(dr.epId, selectedEvent.id, dr.roleId, val)} 
                                    placeholder="Definir..." 
                                  />
                                ) : (
                                  <span style={{ color: 'var(--text-danger)' }}>Erro: Função não cadastrada</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {(true) && (
                        <div style={{ marginTop: 'var(--space-4)' }}>
                          {!addingExtraRole ? (
                            <button className="btn btn-ghost btn-sm" onClick={() => setAddingExtraRole(true)} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                              + Adicionar Função Extra
                            </button>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-3)', backgroundColor: 'var(--background-secondary)', borderRadius: 'var(--radius-md)' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Nova Função Extra</div>
                              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                <select 
                                  className="form-input" 
                                  value={newExtraRoleId}
                                  onChange={(e) => setNewExtraRoleId(e.target.value)}
                                  style={{ flex: 1 }}
                                >
                                  <option value="">Selecione a função...</option>
                                  {availableRoles.filter(r => !standardRoles.includes(r.name) && !displayedRoles.find(dr => dr.roleId === r.id)).map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                                </select>
                                
                                {newExtraRoleId && (
                                  <div style={{ flex: 1 }}>
                                    <PersonSelect 
                                      value=""
                                      onChange={(val) => {
                                         if (val) {
                                            handleUpdateExtraRole(undefined, selectedEvent.id, newExtraRoleId, val);
                                            setAddingExtraRole(false);
                                            setNewExtraRoleId('');
                                         }
                                      }}
                                      placeholder="Escolher pessoa..."
                                    />
                                  </div>
                                )}
                                
                                <button className="btn btn-ghost btn-sm" onClick={() => { setAddingExtraRole(false); setNewExtraRoleId(''); }}>Cancelar</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}

                {selectedEvent.description && (
                  <div className="review-section mt-4">
                    <div className="review-label">Descrição</div>
                    <div className="review-value">{selectedEvent.description}</div>
                  </div>
                )}

                {selectedEvent.notes && (
                  <div className="review-section mt-4">
                    <div className="review-label">Observações</div>
                    <div className="review-value">{selectedEvent.notes}</div>
                  </div>
                )}
              </div>
              {user && (
                <div className="modal-footer">
                  {selectedEvent.event_type?.name?.toLowerCase().includes('culto') && (
                    <Link
                      href={`/eventos/${selectedEvent.id}/liturgia`}
                      className="btn btn-secondary"
                    >
                      📜 Liturgia
                    </Link>
                  )}
                  <Link
                    href={`/eventos/${selectedEvent.id}`}
                    className="btn btn-primary"
                  >
                    Ver Detalhes
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
