import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Se CRON_SECRET estiver configurado na Vercel, valida o token
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Consulta leve nas tabelas para registrar atividade diária no Supabase
    const [locationsRes, eventsRes] = await Promise.allSettled([
      supabase.from('locations').select('id').limit(1),
      supabase.from('events').select('id').limit(1)
    ]);

    const locationsOk = locationsRes.status === 'fulfilled' && !locationsRes.value.error;
    const eventsOk = eventsRes.status === 'fulfilled' && !eventsRes.value.error;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Keep-alive executado. Supabase ativo.',
      results: {
        locations: locationsOk,
        events: eventsOk
      }
    });
  } catch (err: any) {
    console.error('Exceção no ping do Supabase:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
