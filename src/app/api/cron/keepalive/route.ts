import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    // O Vercel envia um header de autorização com o CRON_SECRET que estiver nas variáveis de ambiente
    // para evitar que qualquer pessoa chame essa rota.
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Faz uma requisição super leve apenas para "acordar" o banco de dados
    const { data, error } = await supabase
      .from('events')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Erro no ping do Supabase:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Banco de dados acessado com sucesso para mantê-lo ativo' });
  } catch (err: any) {
    console.error('Exceção no ping do Supabase:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
