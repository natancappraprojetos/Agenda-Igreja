import { createServerSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function PublicEventDetailsPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  
  // Fetch event details
  const { data: event } = await supabase
    .from('events')
    .select(`
      *,
      event_type:event_types(name, icon, color),
      location:locations(name)
    `)
    .eq('id', params.id)
    .single();

  if (!event) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
        <h2>Evento não encontrado</h2>
        <Link href="/" className="btn btn-primary">Voltar para a Agenda</Link>
      </div>
    );
  }

  // Fetch participants
  const { data: participants } = await supabase
    .from('event_participants')
    .select(`
      person:people(name),
      role:roles(name)
    `)
    .eq('event_id', event.id);

  // Fetch liturgy
  const { data: liturgy } = await supabase
    .from('liturgies')
    .select(`
      id, start_time,
      items:liturgy_items(
        id, title, duration_minutes, calculated_time,
        person:people(name),
        song:songs(title, artist)
      )
    `)
    .eq('event_id', event.id)
    .single();

  const eventColor = event.event_type?.color || 'var(--primary)';
  const formattedDate = format(parseISO(event.date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', paddingBottom: 'var(--space-8)' }}>
      {/* Header Público */}
      <header style={{ 
        backgroundColor: eventColor, 
        padding: 'var(--space-4)',
        color: 'white',
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)'
      }}>
        <Link href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '1.5rem' }}>←</Link>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
          {event.event_type?.icon} {event.event_type?.name}
        </h1>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--space-4)' }}>
        {/* Card Principal do Evento */}
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
            {event.title}
          </h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: 'var(--space-4)', textTransform: 'capitalize' }}>
            {formattedDate} • {event.start_time.substring(0, 5)}
          </div>
          {event.location && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: 'var(--radius-full)' }}>
              📍 <strong>{event.location.name}</strong>
            </div>
          )}
        </div>

        {/* Equipe / Escalas */}
        {participants && participants.length > 0 && (
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>👥 Escala</h3>
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {participants.map((p: any, idx: number) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: idx !== participants.length - 1 ? '1px solid var(--border-color)' : 'none', paddingBottom: idx !== participants.length - 1 ? 'var(--space-3)' : 0 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{p.role?.name || 'Participante'}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{p.person?.name}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Liturgia */}
        {liturgy && liturgy.items && liturgy.items.length > 0 ? (
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>📖 Programação</h3>
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {liturgy.items.sort((a: any, b: any) => a.calculated_time.localeCompare(b.calculated_time)).map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', gap: 'var(--space-4)' }}>
                    <div style={{ fontWeight: 700, color: eventColor, minWidth: '45px' }}>
                      {item.calculated_time.substring(0, 5)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                      {item.person && <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>👤 {item.person.name}</div>}
                      {item.song && <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>🎵 {item.song.title} {item.song.artist ? `(${item.song.artist})` : ''}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">Programação não liberada</div>
            <p style={{ color: 'var(--text-secondary)' }}>A ordem do culto ainda não foi definida pela liderança.</p>
          </div>
        )}

      </main>
    </div>
  );
}
