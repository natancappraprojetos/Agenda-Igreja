'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Cria uma pessoa no banco de dados, ignorando o RLS (usado para auto-cadastro e visitantes)
 */
export async function createPersonAdmin(name: string, isTemporary: boolean = false) {
  const { data, error } = await supabaseAdmin
    .from('people')
    .insert({ name: name.trim(), is_active: !isTemporary })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating person admin:', error);
    throw new Error(error.message);
  }
  return data;
}

/**
 * Cria a liturgia inicial para um evento, ignorando o RLS
 */
export async function createLiturgyAdmin(eventId: string, startTime: string) {
  const { data, error } = await supabaseAdmin
    .from('liturgies')
    .insert({ event_id: eventId, start_time: startTime })
    .select()
    .single();
    
  if (error) {
    if (error.code === '23505') { // Duplicate key error
      // It means another request already created it (React Strict Mode double-render)
      const { data: existingData } = await supabaseAdmin
        .from('liturgies')
        .select()
        .eq('event_id', eventId)
        .single();
      return existingData;
    }
    console.error('Error creating liturgy admin:', error);
    throw new Error(error.message);
  }
  return data;
}

/**
 * Salva itens da liturgia gerados automaticamente, ignorando o RLS
 */
export async function saveLiturgyItemsAdmin(lid: string, items: any[]) {
  // 1. Delete existing
  await supabaseAdmin.from('liturgy_items').delete().eq('liturgy_id', lid);
  
  if (!items || items.length === 0) return null;
  
  // 2. Insert new
  const { data, error } = await supabaseAdmin
    .from('liturgy_items')
    .insert(items)
    .select();
    
  if (error) {
    console.error('Error saving liturgy items admin:', error);
    throw new Error(error.message);
  }
  return data;
}
export async function getLiturgyItemPublic(itemId: string) {
  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from('liturgy_items')
    .select('*, liturgy:liturgies(event_id, events(title, date))')
    .eq('id', itemId)
    .single();

  if (error) {
    console.error('getLiturgyItemPublic error:', error);
    throw new Error('Item não encontrado ou erro de permissão.');
  }
  return data;
}

export async function updateLiturgyItemPublic(itemId: string, updateData: any) {
  const supabase = supabaseAdmin;
  const { error } = await supabase
    .from('liturgy_items')
    .update(updateData)
    .eq('id', itemId);

  if (error) {
    console.error('updateLiturgyItemPublic error:', error);
    throw new Error('Não foi possível atualizar o item.');
  }
  return { success: true };
}
