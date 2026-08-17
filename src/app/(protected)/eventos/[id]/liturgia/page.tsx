'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import PersonSelect from '@/components/ui/PersonSelect';
import { calculateLiturgyTimes, formatTime } from '@/lib/utils/liturgy-calculator';
import { formatDateShort } from '@/lib/utils/dates';

interface LocalLiturgyItem {
  id?: string;
  title: string;
  duration_minutes: number;
  order_index: number;
  person_id?: string | null;
  person_name?: string;
  calculated_time?: string;
  emoji?: string;
  notes?: string;
}

export default function LiturgyBuilderPage() {
  const params = useParams();
  const eventId = params.id as string;
  const router = useRouter();
  
  const [event, setEvent] = useState<any>(null);
  const [liturgyId, setLiturgyId] = useState<string | null>(null);
  const [items, setItems] = useState<LocalLiturgyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const supabase = createClient();
  const { addToast } = useToast();
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Event with Participants
      const { data: evData, error: evError } = await supabase
        .from('events')
        .select(`
          *,
          preacher:people!events_preacher_id_fkey(id, name),
          worship_leader:people!events_worship_leader_id_fkey(id, name),
          sound_person:people!events_sound_person_id_fkey(id, name),
          responsible_person:people!events_responsible_person_id_fkey(id, name),
          event_needs(need_type:event_needs_types(name)),
          participants:event_participants(
            person_id,
            role:roles(name),
            person:people(name)
          ),
          sub_events:events!events_parent_event_id_fkey(
            id,
            title,
            event_types(name),
            ministries(name),
            responsible_person:people!events_responsible_person_id_fkey(name)
          )
        `)
        .eq('id', eventId)
        .single();
        
      if (evError) throw evError;
      setEvent(evData);

      // 2. Check if Liturgy exists
      const { data: litData } = await supabase
        .from('liturgies')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (litData) {
        setLiturgyId(litData.id);
        // Fetch items
        const { data: itemsData } = await supabase
          .from('liturgy_items')
          .select('*, person:people(name)')
          .eq('liturgy_id', litData.id)
          .order('order_index');
          
        if (itemsData && itemsData.length > 0) {
          const findPerson = (roleNames: string[]) => {
            const p = evData.participants?.find((p: any) => roleNames.some(rn => p.role?.name?.toLowerCase().includes(rn.toLowerCase())));
            return p ? { id: p.person_id, name: p.person?.name } : null;
          };

          const mapped = itemsData.map(i => {
            let pId = i.responsible_person_id;
            let pName = i.person?.name;
            const t = i.title.toLowerCase();

            if (t.includes('sermão') || t.includes('pregação')) {
              if (evData.preacher_id) { pId = evData.preacher_id; pName = evData.preacher?.name; }
            } else if (t.includes('louvor')) {
              if (evData.worship_leader_id) { pId = evData.worship_leader_id; pName = evData.worship_leader?.name; }
            } else if (t.includes('oferta') || t.includes('fidelidade')) {
              const p = findPerson(['Oferta']);
              if (p) { pId = p.id; pName = p.name; }
            } else if (t.includes('história') || t.includes('criança')) {
              const p = findPerson(['História', 'Criança']);
              if (p) { pId = p.id; pName = p.name; }
            } else if (t.includes('anúncio')) {
              const p = findPerson(['Anúncios', 'Responsável']);
              if (p) { pId = p.id; pName = p.name; }
              else if (evData.responsible_person_id) { pId = evData.responsible_person_id; pName = evData.responsible_person?.name; }
            } else if (t.includes('sabatina') || t.includes('lição') || t.includes('pastoreio')) {
              const p = findPerson(['Sabatina']);
              if (p) { pId = p.id; pName = p.name; }
            }

            return {
              id: i.id,
              title: i.title,
              duration_minutes: i.duration_minutes,
              order_index: i.order_index,
              person_id: pId,
              person_name: pName,
              notes: i.notes || '',
              calculated_time: i.calculated_time
            };
          });
          setItems(calculateLiturgyTimes(mapped, litData.start_time) as LocalLiturgyItem[]);
          setLoading(false);
          return;
        }
      }

      // 3. AUTO-GENERATE IF EMPTY
      await generateTemplate(evData, litData?.id);
      
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  }, [eventId, supabase, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateTemplate = async (ev: any, existingLiturgyId?: string) => {
    const title = ev.title.toLowerCase();
    const date = new Date(ev.date + 'T00:00:00');
    const dayOfWeek = date.getDay(); 
    
    let isSabado = title.includes('sáb') || title.includes('sabado') || dayOfWeek === 6;
    let isQuarta = title.includes('quarta') || dayOfWeek === 3;
    let isDomingo = title.includes('domingo') || dayOfWeek === 0;

    let initialItems: any[] = [];
    
    const findPerson = (roleNames: string[]) => {
      const p = ev.participants?.find((p: any) => roleNames.some(rn => p.role?.name?.toLowerCase().includes(rn.toLowerCase())));
      return p ? { id: p.person_id, name: p.person?.name } : null;
    };

    if (isSabado) {
      initialItems = [
        { emoji: '📘', title: 'Abertura da Escola Sabatina', duration: 10, person: findPerson(['Sabatina']) },
        { emoji: '🎼', title: 'Hino Inicial', duration: 3, person: null },
        { emoji: '🙏', title: 'Oração de Joelhos', duration: 2, person: null },
        { emoji: '🌍', title: 'Informativo Mundial das Missões', duration: 7, person: null },
        { emoji: '📘', title: 'Estudo da Lição nas Classes', duration: 30, person: { name: 'Professores' } },
        { emoji: '💼', title: 'Pastoreio nas Classes', duration: 10, person: { name: 'Professores' } },
        { emoji: '🎼', title: 'Louvor Especial', duration: 5, person: ev.worship_leader },
        { emoji: '📣', title: 'Anúncios', duration: 5, person: findPerson(['Anúncios', 'Responsável']) || ev.responsible_person },
        { emoji: '👨‍👩‍👧‍👦', title: 'Momento da Família', duration: 5, person: null },
        { emoji: '🧸', title: 'História das crianças', duration: 5, person: findPerson(['História', 'Criança']) },
        { emoji: '💰', title: 'Provai e Vede + Ofertas', duration: 10, person: findPerson(['Oferta']) },
        { emoji: '🎼', title: 'Louvores Congregacionais', duration: 10, person: ev.worship_leader },
        { emoji: '🙏', title: 'Oração Inicial (de joelhos)', duration: 5, person: null },
        { emoji: '🎼', title: 'Louvor Especial', duration: 5, person: ev.worship_leader },
        { emoji: '📖', title: 'Sermão', duration: 35, person: ev.preacher },
        { emoji: '🎼', title: 'Louvor Especial', duration: 5, person: ev.worship_leader },
        { emoji: '🙏', title: 'Oração Final', duration: 3, person: ev.preacher },
      ];
    } else if (isQuarta) {
      initialItems = [
        { emoji: '🎼', title: 'Louvor', duration: 5, person: ev.worship_leader },
        { emoji: '🙏', title: 'Oração Inicial', duration: 5, person: null },
        { emoji: '🙏', title: 'Pedidos e agradecimentos', duration: 15, person: null },
        { emoji: '💰', title: 'Momento Fidelidade / Ofertas', duration: 5, person: findPerson(['Oferta']) },
        { emoji: '🎼', title: 'Louvor Inicial', duration: 4, person: ev.worship_leader },
        { emoji: '📖', title: 'Pregação', duration: 30, person: ev.preacher },
        { emoji: '🎼', title: 'Louvor final', duration: 3, person: ev.worship_leader },
        { emoji: '🙏', title: 'Oração Final', duration: 3, person: ev.preacher },
      ];
    } else {
      // Domingo ou Padrão
      initialItems = [
        { emoji: '🎼', title: 'Louvor', duration: 5, person: ev.worship_leader },
        { emoji: '🙏', title: 'Oração Inicial', duration: 5, person: null },
        { emoji: '💰', title: 'Momento Fidelidade / Ofertas', duration: 5, person: findPerson(['Oferta']) },
        { emoji: '🎼', title: 'Louvor Inicial', duration: 5, person: ev.worship_leader },
        { emoji: '📖', title: 'Pregação', duration: 30, person: ev.preacher },
        { emoji: '🎼', title: 'Louvor final', duration: 5, person: ev.worship_leader },
        { emoji: '🙏', title: 'Oração Final', duration: 3, person: ev.preacher },
      ];
    }

    // Inject Sub-events (e.g. Batismo, Comissão) before the Final Prayer
    if (ev.sub_events && ev.sub_events.length > 0) {
      const finalPrayerIndex = initialItems.findIndex(i => i.title.includes('Oração Final'));
      const insertIndex = finalPrayerIndex !== -1 ? finalPrayerIndex : initialItems.length;
      
      const subEventItems = ev.sub_events.map((se: any) => {
        const typeName = se.event_types?.name?.toLowerCase() || '';
        let emoji = '📅';
        if (typeName.includes('batismo')) emoji = '💧';
        if (typeName.includes('comissão')) emoji = '📋';
        if (typeName.includes('ensaio')) emoji = '🎵';
        
        return {
          emoji,
          title: `${se.event_types?.name || 'Evento'}: ${se.title}`,
          duration: typeName.includes('batismo') ? 15 : 10,
          person: se.responsible_person || (se.ministries ? { name: se.ministries.name } : null)
        };
      });
      
      initialItems.splice(insertIndex, 0, ...subEventItems);
    }

    let lid = existingLiturgyId;
    if (!lid) {
      const { data: newLit, error: litErr } = await supabase
        .from('liturgies')
        .insert({ event_id: eventId, start_time: ev.start_time })
        .select()
        .single();
      if (litErr) throw litErr;
      lid = newLit.id;
      setLiturgyId(lid || null);
    }

    const newItems: LocalLiturgyItem[] = initialItems.map((item, idx) => ({
      title: item.title,
      duration_minutes: item.duration,
      order_index: idx + 1,
      person_id: item.person?.id || null,
      person_name: item.person?.name || '',
      emoji: item.emoji,
      notes: ''
    }));

    const calculated = calculateLiturgyTimes(newItems, ev.start_time) as LocalLiturgyItem[];
    setItems(calculated);
    
    // Save to DB silently
    saveToDb(lid!, calculated);
  };

  const saveToDb = async (lid: string, currentItems: LocalLiturgyItem[]) => {
    // Delete existing
    await supabase.from('liturgy_items').delete().eq('liturgy_id', lid);
    
    // Insert new
    const toInsert = currentItems.map(i => ({
      liturgy_id: lid,
      title: i.title,
      duration_minutes: i.duration_minutes,
      order_index: i.order_index,
      responsible_person_id: i.person_id || null,
      calculated_time: i.calculated_time,
      notes: i.notes || null
    }));
    
    await supabase.from('liturgy_items').insert(toInsert);
  };

  const handleUpdateItem = (index: number, field: keyof LocalLiturgyItem, value: any, extraPersonName?: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (extraPersonName !== undefined) {
      newItems[index].person_name = extraPersonName;
    }
    const calculated = calculateLiturgyTimes(newItems, event.start_time) as LocalLiturgyItem[];
    setItems(calculated);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;
    
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    
    // update order_index
    newItems.forEach((item, idx) => item.order_index = idx + 1);
    
    const calculated = calculateLiturgyTimes(newItems, event.start_time) as LocalLiturgyItem[];
    setItems(calculated);
  };

  const addItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index + 1, 0, {
      title: 'Novo Item',
      duration_minutes: 5,
      order_index: 0,
      notes: ''
    });
    const calculated = calculateLiturgyTimes(newItems, event.start_time) as LocalLiturgyItem[];
    setItems(calculated);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    const calculated = calculateLiturgyTimes(newItems, event.start_time) as LocalLiturgyItem[];
    setItems(calculated);
  };

  const handleSave = async () => {
    if (!liturgyId) return;
    setSaving(true);
    try {
      await saveToDb(liturgyId, items);
      addToast({ type: 'success', title: 'Liturgia salva com sucesso!' });
    } catch (e) {
      addToast({ type: 'error', title: 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  const copyToWhatsApp = () => {
    const header = `*Liturgia do Culto de ${event.title} – ${formatDateShort(event.date)}*\n`;
    const sound = event.sound_person?.name ? `🖥️ Sonoplastia: ${event.sound_person.name}\n\n` : `🖥️ Sonoplastia: ---\n\n`;
    
    const body = items.map(item => {
      // Determine emoji fallback based on text
      let emoji = item.emoji;
      if (!emoji) {
        const titleLower = item.title.toLowerCase();
        if (titleLower.includes('oração') || titleLower.includes('orar')) emoji = '🙏';
        else if (titleLower.includes('louvor') || titleLower.includes('hino') || titleLower.includes('cantar')) emoji = '🎼';
        else if (titleLower.includes('sermão') || titleLower.includes('pregação') || titleLower.includes('mensagem')) emoji = '📖';
        else if (titleLower.includes('oferta') || titleLower.includes('dízimo')) emoji = '💰';
        else if (titleLower.includes('anúncio')) emoji = '📣';
        else if (titleLower.includes('história') || titleLower.includes('criança')) emoji = '🧸';
        else emoji = '🔸';
      }
      
      let personStr = item.person_name ? ` (${item.person_name})` : '';
      let notesStr = item.notes ? `\n▪️ ${item.notes.replace(/\n/g, '\n▪️ ')}` : '';
      
      return `${emoji} ${formatTime(item.calculated_time)} – ${item.title}${personStr}${notesStr}`;
    }).join('\n');
    
    const text = header + sound + body;
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast({ type: 'success', title: 'Copiado para a área de transferência!' });
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading || !event) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>
            ← Voltar
          </button>
          <h1 className="app-title">Gerador de Liturgia</h1>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-outline btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : '💾 Salvar'}
          </button>
          <button className={`btn btn-${copied ? 'success' : 'primary'} btn-sm`} onClick={copyToWhatsApp}>
            {copied ? '✅ Copiado!' : '📱 Copiar (WhatsApp)'}
          </button>
        </div>
      </header>

      <div className="app-content" style={{ maxWidth: '800px', margin: '0 auto', width: '100%', paddingBottom: '100px' }}>
        <div className="card mb-4" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 var(--space-2) 0' }}>{event.title}</h2>
          <p style={{ margin: 0, opacity: 0.9 }}>{formatDateShort(event.date)} • {formatTime(event.start_time)}</p>
        </div>

        <div className="liturgy-builder" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {items.map((item, idx) => (
            <div key={idx} className="card" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', padding: 'var(--space-3)' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <button 
                  className="btn btn-ghost" 
                  style={{ padding: '4px', height: 'auto', minHeight: 'auto', opacity: idx === 0 ? 0.3 : 1 }}
                  onClick={() => moveItem(idx, 'up')}
                  disabled={idx === 0}
                >
                  ⬆️
                </button>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{idx + 1}</div>
                <button 
                  className="btn btn-ghost" 
                  style={{ padding: '4px', height: 'auto', minHeight: 'auto', opacity: idx === items.length - 1 ? 0.3 : 1 }}
                  onClick={() => moveItem(idx, 'down')}
                  disabled={idx === items.length - 1}
                >
                  ⬇️
                </button>
              </div>

              <div style={{ width: '60px', fontWeight: 600, color: 'var(--primary)', paddingTop: '8px', fontSize: '1.1rem' }}>
                {formatTime(item.calculated_time)}
              </div>

              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={item.title} 
                    onChange={(e) => handleUpdateItem(idx, 'title', e.target.value)}
                    placeholder="Título do Item"
                    style={{ fontWeight: 600, flex: 1 }}
                  />
                  
                  <div style={{ width: '90px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={item.duration_minutes || ''} 
                      onChange={(e) => handleUpdateItem(idx, 'duration_minutes', parseInt(e.target.value) || 0)}
                      min="1"
                      style={{ paddingRight: '4px', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>min</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <div style={{ flex: 1 }}>
                    <PersonSelect
                      value={item.person_id || ''}
                      onChange={(val, person) => handleUpdateItem(idx, 'person_id', val, person?.name || '')}
                      placeholder="Responsável (Opcional)"
                    />
                  </div>
                </div>
                
                {/* Notes/Lyrics input for songs or details */}
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.85rem', backgroundColor: 'var(--background-secondary)', border: '1px dashed var(--border)' }}
                  placeholder="Detalhes ou Louvores (ex: Hino 100, ou: Título da Música)"
                  value={item.notes || ''}
                  onChange={(e) => handleUpdateItem(idx, 'notes', e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button className="btn btn-ghost" style={{ padding: '8px', color: 'var(--text-danger)' }} onClick={() => removeItem(idx)} title="Remover">
                  🗑️
                </button>
                <button className="btn btn-ghost" style={{ padding: '8px', color: 'var(--primary)' }} onClick={() => addItem(idx)} title="Adicionar abaixo">
                  ➕
                </button>
              </div>

            </div>
          ))}

          {items.length === 0 && (
            <button className="btn btn-outline" style={{ padding: 'var(--space-4)' }} onClick={() => addItem(-1)}>
              + Adicionar Primeiro Item
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
