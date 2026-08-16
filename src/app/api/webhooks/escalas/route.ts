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

    // Fetch the message template from settings
    const { data: settingData } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'whatsapp_schedule_template')
      .single();

    const templateText = settingData?.value || 'Olá {{nome}}! Você está escalado como {{funcao}} no {{evento}} do dia {{data}} às {{horario}}';

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
          const nome = participant.person.name;
          const funcao = participant.role?.name || 'Escalado';
          const evento = event.title;
          const data = event.date.split('-').reverse().join('/'); // Format to DD/MM/YYYY
          const horario = event.start_time;

          let mensagem = templateText
            .replace(/\{\{nome\}\}/g, nome)
            .replace(/\{\{funcao\}\}/g, funcao)
            .replace(/\{\{evento\}\}/g, evento)
            .replace(/\{\{data\}\}/g, data)
            .replace(/\{\{horario\}\}/g, horario);

          notifications.push({
            nome: nome,
            whatsapp: participant.person.whatsapp,
            funcao: funcao,
            evento: evento,
            data: event.date, // keep original date format for unique IDs
            horario: horario,
            mensagem: mensagem
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
