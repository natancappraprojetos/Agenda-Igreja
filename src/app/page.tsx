'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';
import type { ChurchEvent, CalendarView } from '@/lib/types';
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
  const supabase = createClient();
  const { user, isLeadership } = useAuth();

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
          responsible_person:people!events_responsible_person_id_fkey(*)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .neq('status', 'cancelled')
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
    events.filter(e => isSameDay(parseDate(e.date), date));

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
              {event.preacher ? (
                <span className="badge badge-success">✅ Pregador</span>
              ) : event.event_type?.name === 'Culto' ? (
                <span className="badge badge-danger">❌ Pregador</span>
              ) : null}
              {event.needs_sound && !event.sound_person && (
                <span className="badge badge-warning">⚠️ Sonoplastia</span>
              )}
              {event.needs_sound && event.sound_person && (
                <span className="badge badge-success">✅ Sonoplastia</span>
              )}
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
              <div className="calendar-day-number">{day.getDate()}</div>
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
                    {formatTime(ev.start_time)} {ev.title}
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
              dayEvents.map(renderEventCard)
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
        backgroundColor: 'var(--bg-primary)', 
        padding: 'var(--space-4) var(--space-4)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="login-logo" style={{ overflow: 'hidden', width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--primary)' }}>
            <img src="/icon" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
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
        <div className="calendar-header">
          <div className="calendar-nav">
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

                <div className="review-grid">
                  {selectedEvent.preacher && (
                    <div className="review-section">
                      <div className="review-label">🎤 Pregador</div>
                      <div className="review-value">{selectedEvent.preacher.name}</div>
                    </div>
                  )}
                  {selectedEvent.worship_leader && (
                    <div className="review-section">
                      <div className="review-label">🎵 Louvor</div>
                      <div className="review-value">{selectedEvent.worship_leader.name}</div>
                    </div>
                  )}
                  {selectedEvent.sound_person && (
                    <div className="review-section">
                      <div className="review-label">🔊 Sonoplastia</div>
                      <div className="review-value">{selectedEvent.sound_person.name}</div>
                    </div>
                  )}
                  {selectedEvent.responsible_person && (
                    <div className="review-section">
                      <div className="review-label">👤 Responsável</div>
                      <div className="review-value">{selectedEvent.responsible_person.name}</div>
                    </div>
                  )}
                </div>

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
                  <Link
                    href={`/eventos/${selectedEvent.id}/liturgia`}
                    className="btn btn-secondary"
                  >
                    📜 Liturgia
                  </Link>
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
