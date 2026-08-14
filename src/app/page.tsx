import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Event } from '@/lib/types';

export default async function PublicAgendaPage() {
  const supabase = createClient();

  // Fetch upcoming events from today onwards
  const today = new Date().toISOString().split('T')[0];
  const { data: events } = await supabase
    .from('events')
    .select(`
      id, title, date, start_time, end_time, status,
      event_type:event_types(name, icon, color),
      location:locations(name)
    `)
    .gte('date', today)
    .neq('status', 'cancelled')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(20);

  const formatEventDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    
    // Capitalize first letter of weekday
    const weekday = format(date, 'EEEE', { locale: ptBR });
    const formattedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    
    if (isThisWeek(date)) return formattedWeekday;
    return `${formattedWeekday}, ${format(date, "dd 'de' MMM", { locale: ptBR })}`;
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // 19:30:00 -> 19:30
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', paddingBottom: 'var(--space-8)' }}>
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
          <div style={{ 
            width: 40, height: 40, borderRadius: 'var(--radius-md)', 
            backgroundColor: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 700
          }}>
            AI
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Agenda Igreja
          </h1>
        </div>
        <Link href="/login" className="btn btn-ghost btn-sm" style={{ fontWeight: 600 }}>
          Login 👤
        </Link>
      </header>

      {/* Conteúdo Principal */}
      <main style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--space-4)' }}>
        
        <div style={{ textAlign: 'center', margin: 'var(--space-6) 0' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            Próximos Cultos e Eventos
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Acompanhe nossa programação e não perca nada!
          </p>
        </div>

        {!events || events.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 'var(--space-8)', backgroundColor: 'var(--bg-primary)' }}>
            <div className="empty-state-icon">🗓️</div>
            <div className="empty-state-title">Nenhum evento programado</div>
            <p style={{ color: 'var(--text-secondary)' }}>A liderança ainda não adicionou os próximos eventos.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {events.map((event: any) => {
              const eventColor = event.event_type?.color || 'var(--primary)';
              
              return (
                <Link 
                  href={`/evento/${event.id}`} 
                  key={event.id}
                  style={{ textDecoration: 'none' }}
                >
                  <div className="card" style={{ 
                    padding: 'var(--space-4)', 
                    display: 'flex', 
                    gap: 'var(--space-4)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    {/* Faixa lateral colorida */}
                    <div style={{ 
                      position: 'absolute', top: 0, left: 0, bottom: 0, 
                      width: '6px', backgroundColor: eventColor 
                    }} />

                    {/* Lado esquerdo: Data e Hora */}
                    <div style={{ 
                      minWidth: '80px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      borderRight: '1px solid var(--border-color)',
                      paddingRight: 'var(--space-4)'
                    }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {formatEventDate(event.date)}
                      </span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {formatTime(event.start_time)}
                      </span>
                    </div>

                    {/* Lado direito: Detalhes */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                        <span style={{ fontSize: '1.2rem' }}>{event.event_type?.icon || '📅'}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: eventColor }}>
                          {event.event_type?.name}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 var(--space-2) 0' }}>
                        {event.title}
                      </h3>
                      
                      {event.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          📍 {event.location.name}
                        </div>
                      )}
                    </div>

                    {/* Seta */}
                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)' }}>
                      ➔
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Action Button para Agendar */}
      <Link 
        href="/agendar" 
        style={{
          position: 'fixed',
          bottom: 'var(--space-6)',
          right: 'var(--space-6)',
          backgroundColor: 'var(--primary)',
          color: 'white',
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
          textDecoration: 'none',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          zIndex: 20,
          transition: 'transform 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: '1.2rem' }}>+</span> Agendar Evento
      </Link>
    </div>
  );
}
