import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Protect this route with a simple token.
// The user should send ?token=YOUR_SECRET in the n8n HTTP Request.
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'n8n_santoafonso';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (token !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get current date and 7 days from now (YYYY-MM-DD)
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const { data: events, error } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        title,
        date,
        start_time,
        event_participants (
          person:people (
            name,
            whatsapp
          ),
          role:roles (
            name
          )
        )
      `)
      .gte('date', formatDate(today))
      .lte('date', formatDate(nextWeek))
      .neq('status', 'cancelled')
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Format data into a flat array for easier n8n processing
    // Example: [{ nome: "João", whatsapp: "55519999", funcao: "Pregador", evento: "Culto de Sábado", data: "2024-08-20", horario: "09:00:00" }]
    const notifications: any[] = [];

    events?.forEach(event => {
      event.event_participants?.forEach((participant: any) => {
        if (participant.person?.whatsapp) {
          notifications.push({
            nome: participant.person.name,
            whatsapp: participant.person.whatsapp,
            funcao: participant.role?.name || 'Escalado',
            evento: event.title,
            data: event.date,
            horario: event.start_time
          });
        }
      });
    });

    return NextResponse.json(notifications);

  } catch (err: any) {
    console.error('Webhook Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
