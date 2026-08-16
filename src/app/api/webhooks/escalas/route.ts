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

    // Fetch all message templates from settings
    const { data: settingData } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .like('key', 'whatsapp_template_%');

    const templates = {
      default: settingData?.find(s => s.key === 'whatsapp_template_default')?.value || 'Olá *{{nome}}*! Você está escalado(a) como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.',
      pregador: settingData?.find(s => s.key === 'whatsapp_template_pregador')?.value || 'Olá *{{nome}}*! Você está escalado(a) para trazer a mensagem como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.',
      musica: settingData?.find(s => s.key === 'whatsapp_template_musica')?.value || 'Olá *{{nome}}*! Lembrete do Louvor: você está escalado(a) como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.',
      sonoplastia: settingData?.find(s => s.key === 'whatsapp_template_sonoplastia')?.value || 'Olá *{{nome}}*! Lembrete da equipe técnica: você está escalado(a) na *{{funcao}}* para o *{{evento}}* do dia *{{data}}* às *{{horario}}*.',
      diaconato: settingData?.find(s => s.key === 'whatsapp_template_diaconato')?.value || 'Olá *{{nome}}*! Lembrete do Diaconato: você está escalado(a) como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.',
    };

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

          // Determine which template to use based on the role
          let roleName = participant.role?.name?.toLowerCase() || '';
          let templateText = templates.default;
          
          if (roleName.includes('pregador') || roleName.includes('mensagem')) {
            templateText = templates.pregador;
          } else if (roleName.includes('cantor') || roleName.includes('música') || roleName.includes('louvor') || roleName.includes('instrumentista')) {
            templateText = templates.musica;
          } else if (roleName.includes('sonoplast') || roleName.includes('áudio') || roleName.includes('som') || roleName.includes('multimídia') || roleName.includes('transmissão')) {
            templateText = templates.sonoplastia;
          } else if (roleName.includes('diácono') || roleName.includes('diaconisa') || roleName.includes('recepção')) {
            templateText = templates.diaconato;
          }

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
