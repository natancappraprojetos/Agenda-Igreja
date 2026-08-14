'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import Header from '@/components/layout/Header';
import type { Schedule } from '@/lib/types';
import { formatDateShort, getWeekdayName, parseDate } from '@/lib/utils/dates';
import { formatTime } from '@/lib/utils/liturgy-calculator';

export default function MinhaAgendaPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const { person } = useAuth();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!person) return;
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('schedules')
      .select(`
        *,
        event:events(*,
          event_type:event_types(*),
          location:locations(*)
        ),
        role:roles(*)
      `)
      .eq('person_id', person.id)
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    setSchedules((data || []) as unknown as Schedule[]);
    setLoading(false);
  }, [person, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group by date
  const grouped = schedules.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {} as Record<string, Schedule[]>);

  return (
    <>
      <Header title="Minha Agenda" onMenuToggle={() => {}} />
      <div className="app-content">
        {!person ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-title">Perfil não vinculado</div>
            <div className="empty-state-description">
              Seu usuário ainda não está vinculado a uma pessoa. Peça ao administrador para fazer o vínculo.
            </div>
          </div>
        ) : loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : schedules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">Nenhum compromisso</div>
            <div className="empty-state-description">
              Você não tem compromissos programados.
            </div>
          </div>
        ) : (
          <div className="calendar-list">
            {Object.entries(grouped).map(([date, daySchedules]) => {
              const d = parseDate(date);
              return (
                <div key={date} className="calendar-list-day">
                  <div className="calendar-list-day-header">
                    <span className="calendar-list-day-name">{getWeekdayName(d)}</span>
                    <span className="calendar-list-day-date">{formatDateShort(date)}</span>
                  </div>
                  <div className="calendar-list-events">
                    {daySchedules.map(s => (
                      <div key={s.id} className="event-card" style={{ borderLeftColor: s.event?.event_type?.color || 'var(--primary)' }}>
                        <div className="event-card-time">{formatTime(s.start_time)}</div>
                        <div className="event-card-content">
                          <div className="event-card-title">
                            {s.event?.event_type?.icon} {s.event?.title}
                          </div>
                          <div className="event-card-info">
                            {s.event?.location && (
                              <span className="event-card-info-item">📍 {s.event.location.name}</span>
                            )}
                            {s.role && (
                              <span className="badge badge-primary">{s.role.name}</span>
                            )}
                          </div>
                          {s.notes && (
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                              📝 {s.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
