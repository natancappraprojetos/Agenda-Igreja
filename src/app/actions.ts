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
    .select(`
      *,
      responsible_person:people(id, name),
      liturgy:liturgies(
        event_id,
        events(
          id,
          title,
          date,
          start_time
        )
      )
    `)
    .eq('id', itemId)
    .single();

  if (error) {
    console.error('getLiturgyItemPublic error:', error);
    throw new Error('Item não encontrado ou link inválido.');
  }

  // Also fetch list of active church members for the autocomplete
  const { data: peopleData } = await supabase
    .from('people')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  return {
    item: data,
    people: peopleData || []
  };
}

export async function updateLiturgyItemPublic(itemId: string, payload: {
  responsible_person_id?: string | null;
  custom_name?: string | null;
  notes?: string | null;
  singers?: string | null;
  songs?: string[];
  offering_data?: {
    diacono1?: string;
    diacono2?: string;
    oracao?: string;
  };
}) {
  const supabase = supabaseAdmin;

  let finalPersonId = payload.responsible_person_id || null;

  // If a custom name was typed and no person ID selected:
  if (!finalPersonId && payload.custom_name && payload.custom_name.trim()) {
    const trimmed = payload.custom_name.trim();
    // Check if person exists in people table
    const { data: existing } = await supabase
      .from('people')
      .select('id')
      .ilike('name', trimmed)
      .maybeSingle();

    if (existing) {
      finalPersonId = existing.id;
    } else {
      // Create new person in people table
      const { data: newPerson, error: pError } = await supabase
        .from('people')
        .insert({ name: trimmed, is_active: true })
        .select('id')
        .single();
      if (!pError && newPerson) {
        finalPersonId = newPerson.id;
      }
    }
  }

  // If musical list with singers/songs
  let finalNotes = payload.notes || null;
  if ((payload.singers && payload.singers.trim()) || (payload.songs && payload.songs.length > 0)) {
    finalNotes = JSON.stringify({
      singers: (payload.singers || '').trim(),
      songs: payload.songs || []
    });
  } else if (payload.offering_data) {
    const off = payload.offering_data;
    finalNotes = JSON.stringify({
      type: 'offering',
      diacono1: (off.diacono1 || '').trim(),
      diacono2: (off.diacono2 || '').trim(),
      oracao: (off.oracao || '').trim(),
      obs: (payload.notes || '').trim()
    });
  }

  const updateFields: any = {
    responsible_person_id: finalPersonId,
    notes: finalNotes
  };

  const { error } = await supabase
    .from('liturgy_items')
    .update(updateFields)
    .eq('id', itemId);

  if (error) {
    console.error('updateLiturgyItemPublic error:', error);
    throw new Error('Não foi possível atualizar o item.');
  }
  return { success: true };
}

/**
 * Exclui um evento com verificação de permissões do usuário logado:
 * - Admin: pode excluir qualquer evento
 * - Criador do evento (created_by): pode excluir o que criou
 * - Culto: qualquer Ancião pode excluir
 */
export async function deleteEventAction(eventId: string) {
  const { createServerSupabaseClient } = await import('@/lib/supabase/server');
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    throw new Error('Usuário não autenticado.');
  }

  // 1. Obter dados do usuário e seus papéis
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select(`
      id,
      person_id,
      user_app_roles(app_roles(name, level))
    `)
    .eq('id', authUser.id)
    .single();

  const roles = userData?.user_app_roles?.map((r: any) => r.app_roles?.name).filter(Boolean) || [];
  const maxLevel = userData?.user_app_roles?.reduce((max: number, r: any) => Math.max(max, r.app_roles?.level || 0), 0) || 0;
  const isAdmin = roles.includes('admin') || maxLevel >= 5;
  const isAnciao = roles.includes('anciao') || maxLevel >= 4;

  // 2. Obter o evento
  const { data: event, error: eventErr } = await supabaseAdmin
    .from('events')
    .select('*, event_type:event_types(name)')
    .eq('id', eventId)
    .single();

  if (eventErr || !event) {
    throw new Error('Evento não encontrado.');
  }

  const isCulto = event.event_type?.name?.toLowerCase().includes('culto') || event.title?.toLowerCase().includes('culto');
  const isCreator = (event.created_by && event.created_by === authUser.id) || 
                    (userData?.person_id && event.responsible_person_id && event.responsible_person_id === userData.person_id);

  const canDelete = isAdmin || isCreator || (isCulto && isAnciao) || maxLevel >= 3;

  if (!canDelete) {
    throw new Error('Você não tem permissão para excluir este evento.');
  }

  // 3. Excluir o evento
  const { error: delErr } = await supabaseAdmin
    .from('events')
    .delete()
    .eq('id', eventId);

  if (delErr) {
    console.error('deleteEventAction error:', delErr);
    throw new Error(delErr.message || 'Erro ao excluir o evento.');
  }

  return { success: true };
}
