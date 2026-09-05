'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import { createLiturgyAdmin, saveLiturgyItemsAdmin } from '@/app/actions';
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
  is_list?: boolean;
  list_data?: { singers: string; songs: string[] };
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
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
          sub_events:events(
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
            const p = evData.participants?.find((p: any) => roleNames.some(rn => p.role?.name?.toLowerCase()?.includes(rn.toLowerCase())));
            return p ? { id: p.person_id, name: p.person?.name } : null;
          };
          const findPeopleNames = (roleNames: string[]) => {
            const pList = evData.participants?.filter((p: any) => roleNames.some(rn => p.role?.name?.toLowerCase()?.includes(rn.toLowerCase())));
            if (pList && pList.length > 0) return pList.map((p: any) => p.person?.name).join(', ');
            return null;
          };

          const mapped = itemsData.map(i => {
            let pId = i.responsible_person_id;
            let pName = i.person?.name;
            const t = (i.title || '').toLowerCase();

            if (t.includes('sermão') || t.includes('pregação') || t.includes('oração final')) {
              if (!pId && evData.preacher_id) { pId = evData.preacher_id; pName = evData.preacher?.name; }
            } else if (t.includes('louvor especial') || t.includes('louvor inicial') || t.includes('louvor final') || t === 'louvor') {
              if (!pId && evData.worship_leader_id) { pId = evData.worship_leader_id; pName = evData.worship_leader?.name; }
            } else if (t.includes('oferta') || t.includes('fidelidade')) {
              const p = findPerson(['Oferta']);
              if (!pId && p) { pId = p.id; pName = p.name; }
            } else if (t.includes('história') || t.includes('criança')) {
              const p = findPerson(['História', 'Criança']);
              if (!pId && p) { pId = p.id; pName = p.name; }
            } else if (t.includes('anúncio')) {
              const p = findPerson(['Anúncios', 'Responsável']);
              if (!pId && p) { pId = p.id; pName = p.name; }
              else if (!pId && evData.responsible_person_id) { pId = evData.responsible_person_id; pName = evData.responsible_person?.name; }
            } else if (t.includes('sabatina') || t.includes('lição') || t.includes('pastoreio')) {
              const p = findPerson(['Sabatina']);
              if (!pId && p) { pId = p.id; pName = p.name; }
            }

            let isList = false;
            let listData = { singers: '', songs: ['', '', ''] };
            let textNotes = i.notes || '';
            
            // Force list mode for Louvor items
            const isLouvorGroup = t.includes('louvor') && !t.includes('especial');
            
            if (textNotes.trim().startsWith('{') && textNotes.trim().endsWith('}')) {
              try {
                const parsed = JSON.parse(textNotes);
                if (parsed.songs && Array.isArray(parsed.songs)) {
                  listData = parsed;
                }
              } catch(e) {}
            }
            
            if (isLouvorGroup && (!listData.singers || listData.singers === '')) {
               const leaderNameFull = findPeopleNames(['Líder de Louvor', 'Música']) || evData.worship_leader?.name;
               const leaderName = leaderNameFull ? leaderNameFull.split(' ')[0] : null;
               
               const teamNamesFull = evData.participants?.filter((p: any) => {
                  const rn = p.role?.name?.toLowerCase() || '';
                  return rn.includes('congregacional') || rn === 'vocal' || rn.includes('equipe');
               }).map((p: any) => p.person?.name).filter(Boolean);
               
               const teamNames = teamNamesFull?.length > 0 ? teamNamesFull.map((n: string) => n.split(' ')[0]).join(', ') : null;
               
               const parts = [];
               if (leaderName) parts.push(`Responsável: ${leaderName}`);
               if (teamNames) parts.push(`Equipe: ${teamNames}`);
               listData.singers = parts.join(' | ');
            } else if (t.includes('louvor especial') && (!pId || pId === evData.worship_leader_id)) {
               // Try to pull Cantor Solo if not explicitly set to someone else
               const solo = findPerson(['Solo']);
               if (solo) {
                  pId = solo.id;
                  pName = solo.name;
               }
            }

            return {
              id: i.id,
              title: i.title,
              duration_minutes: i.duration_minutes,
              order_index: i.order_index,
              person_id: pId,
              person_name: pName,
              notes: isLouvorGroup ? '' : textNotes,
              is_list: isLouvorGroup,
              list_data: listData,
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
      console.error("LITURGIA ERROR", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      addToast({ type: 'error', title: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  }, [eventId, supabase, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const generateTemplate = async (ev: any, existingLiturgyId?: string) => {
    const title = (ev.title || '').toLowerCase();
    const date = new Date(ev.date + 'T00:00:00');
    const dayOfWeek = date.getDay(); 
    
    let isSabado = title.includes('sáb') || title.includes('sabado') || dayOfWeek === 6;
    let isQuarta = title.includes('quarta') || dayOfWeek === 3;
    let isDomingo = title.includes('domingo') || dayOfWeek === 0;

    let initialItems: any[] = [];
    
    const findPerson = (roleNames: string[]) => {
      const p = ev.participants?.find((p: any) => roleNames.some(rn => p.role?.name?.toLowerCase()?.includes(rn.toLowerCase())));
      return p ? { id: p.person_id, name: p.person?.name } : null;
    };
    const findPeopleNames = (roleNames: string[]) => {
      const pList = ev.participants?.filter((p: any) => roleNames.some(rn => p.role?.name?.toLowerCase()?.includes(rn.toLowerCase())));
      if (pList && pList.length > 0) return pList.map((p: any) => p.person?.name).join(', ');
      return null;
    };

    if (isSabado) {
      initialItems = [
        { emoji: '📘', title: 'Abertura da Escola Sabatina', duration: 10, person: findPerson(['Sabatina']) },
        { emoji: '🎼', title: 'Hino Inicial', duration: 3, person: null },
        { emoji: '🙏', title: 'Oração de Joelhos', duration: 2, person: null },
        { emoji: '🌍', title: 'Informativo Mundial das Missões', duration: 7, person: null },
        { emoji: '📘', title: 'Estudo da Lição nas Classes', duration: 30, person: { name: 'Professores' } },
        { emoji: '💼', title: 'Pastoreio nas Classes', duration: 10, person: { name: 'Professores' } },
        { emoji: '🎼', title: 'Louvor Especial', duration: 5, person: findPerson(['Solo']) || ev.worship_leader },
        { emoji: '📣', title: 'Anúncios', duration: 5, person: findPerson(['Anúncios', 'Responsável']) || ev.responsible_person },
        { emoji: '👨‍👩‍👧‍👦', title: 'Momento da Família', duration: 5, person: null },
        { emoji: '🧸', title: 'História das crianças', duration: 5, person: findPerson(['História', 'Criança']) },
        { emoji: '💰', title: 'Provai e Vede + Ofertas', duration: 10, person: findPerson(['Oferta']) },
        { emoji: '🎼', title: 'Louvores Congregacionais', duration: 10, person: ev.worship_leader },
        { emoji: '🎤', title: 'Mensagem Musical', duration: 5, person: findPerson(['Solo']) || ev.worship_leader },
        { emoji: '🙏', title: 'Oração Inicial (de joelhos)', duration: 5, person: null },
        { emoji: '🎼', title: 'Louvor Especial', duration: 5, person: findPerson(['Solo']) || ev.worship_leader },
        { emoji: '📖', title: 'Sermão', duration: 35, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
        { emoji: '🎼', title: 'Louvor Especial', duration: 5, person: findPerson(['Solo']) || ev.worship_leader },
        { emoji: '🙏', title: 'Oração Final', duration: 3, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
      ];
    } else if (isQuarta) {
      initialItems = [
        { emoji: '🎼', title: 'Louvor', duration: 5, person: ev.worship_leader },
        { emoji: '🙏', title: 'Oração Inicial', duration: 5, person: null },
        { emoji: '🙏', title: 'Pedidos e agradecimentos', duration: 15, person: null },
        { emoji: '💰', title: 'Momento Fidelidade / Ofertas', duration: 5, person: findPerson(['Oferta']) },
        { emoji: '🎼', title: 'Louvor Inicial', duration: 4, person: ev.worship_leader },
        { emoji: '📖', title: 'Pregação', duration: 30, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
        { emoji: '🎼', title: 'Louvor final', duration: 3, person: ev.worship_leader },
        { emoji: '🙏', title: 'Oração Final', duration: 3, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
      ];
    } else {
      // Domingo ou Padrão
      initialItems = [
        { emoji: '🎼', title: 'Louvor', duration: 5, person: ev.worship_leader },
        { emoji: '🙏', title: 'Oração Inicial', duration: 5, person: null },
        { emoji: '💰', title: 'Momento Fidelidade / Ofertas', duration: 5, person: findPerson(['Oferta']) },
        { emoji: '🎼', title: 'Louvor Inicial', duration: 5, person: ev.worship_leader },
        { emoji: '📖', title: 'Pregação', duration: 30, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
        { emoji: '🎼', title: 'Louvor final', duration: 5, person: ev.worship_leader },
        { emoji: '🙏', title: 'Oração Final', duration: 3, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
      ];
    }

    // Inject Sub-events (e.g. Batismo, Comissão)
    if (ev.sub_events && ev.sub_events.length > 0) {
      ev.sub_events.forEach((se: any) => {
        const typeName = se.event_types?.name?.toLowerCase() || '';
        const person = se.responsible_person || (se.ministries ? { name: se.ministries.name } : null);
        
        if (typeName.includes('batismo')) {
          // Votos Batismais before Louvores Congregacionais
          const louvorCongIndex = initialItems.findIndex(i => i.title.toLowerCase().includes('louvores congregacionais') || i.title.toLowerCase().includes('louvor inicial'));
          const insertVotosIdx = louvorCongIndex !== -1 ? louvorCongIndex : 0;
          initialItems.splice(insertVotosIdx, 0, {
            emoji: '💧',
            title: `Votos Batismais: ${se.title}`,
            duration: 5,
            person
          });
          
          // Batismo after Sermão / Pregação, before next Louvor Especial
          const sermaoIndex = initialItems.findIndex(i => i.title.toLowerCase().includes('sermão') || i.title.toLowerCase().includes('pregação'));
          let insertBatismoIdx = initialItems.length;
          
          if (sermaoIndex !== -1) {
            insertBatismoIdx = sermaoIndex + 1; // Immediately after sermão
          } else {
            // Fallback: before Oração Final
            const finalPrayerIndex = initialItems.findIndex(i => i.title.toLowerCase().includes('oração final'));
            if (finalPrayerIndex !== -1) insertBatismoIdx = finalPrayerIndex;
          }
          
          initialItems.splice(insertBatismoIdx, 0, {
            emoji: '💧',
            title: `Cerimônia de Batismo: ${se.title}`,
            duration: 10,
            person
          });
          
        } else {
          // Other sub-events (Comissão, Ensaio, etc) go before Oração Final
          const finalPrayerIndex = initialItems.findIndex(i => i.title.toLowerCase().includes('oração final'));
          const insertIndex = finalPrayerIndex !== -1 ? finalPrayerIndex : initialItems.length;
          
          let emoji = '📅';
          if (typeName.includes('comissão')) emoji = '📋';
          if (typeName.includes('ensaio')) emoji = '🎵';
          
          initialItems.splice(insertIndex, 0, {
            emoji,
            title: `${se.event_types?.name || 'Evento'}: ${se.title}`,
            duration: 10,
            person
          });
        }
      });
    }

    // Inject extra roles (e.g. Batismo added via "Função Extra")
    const batismoParticipants = ev.participants?.filter((p: any) => p.role?.name?.toLowerCase().includes('batismo')) || [];
    batismoParticipants.forEach((bp: any) => {
      // Avoid duplicates if they already created a sub-event and a role
      const nameToCheck = bp.person?.name || 'Candidato';
      const exists = initialItems.some(i => i.title.includes(nameToCheck) && i.title.includes('Batismo'));
      if (exists) return;

      const louvorCongIndex = initialItems.findIndex(i => i.title.toLowerCase().includes('louvores congregacionais') || i.title.toLowerCase().includes('louvor inicial'));
      const insertVotosIdx = louvorCongIndex !== -1 ? louvorCongIndex : 0;
      initialItems.splice(insertVotosIdx, 0, {
        emoji: '💧',
        title: `Votos Batismais: ${nameToCheck}`,
        duration: 5,
        person: { id: bp.person_id, name: bp.person?.name }
      });
      
      const sermaoIndex = initialItems.findIndex(i => i.title.toLowerCase().includes('sermão') || i.title.toLowerCase().includes('pregação'));
      let insertBatismoIdx = initialItems.length;
      
      if (sermaoIndex !== -1) {
        insertBatismoIdx = sermaoIndex + 1;
      } else {
        const finalPrayerIndex = initialItems.findIndex(i => i.title.toLowerCase().includes('oração final'));
        if (finalPrayerIndex !== -1) insertBatismoIdx = finalPrayerIndex;
      }
      
      initialItems.splice(insertBatismoIdx, 0, {
        emoji: '💧',
        title: `Cerimônia de Batismo: ${nameToCheck}`,
        duration: 10,
        person: { id: bp.person_id, name: bp.person?.name }
      });
    });

    // Inject needs (e.g. Batismo added via "Necessidades do evento")
    const hasBatismoNeed = ev.event_needs?.some((n: any) => n.need_type?.name?.toLowerCase().includes('batismo'));
    if (hasBatismoNeed) {
      // Avoid duplicates if already injected via sub-event or participant
      const exists = initialItems.some(i => i.title.includes('Batismo'));
      if (!exists) {
        const louvorCongIndex = initialItems.findIndex(i => i.title.toLowerCase().includes('louvores congregacionais') || i.title.toLowerCase().includes('louvor inicial'));
        const insertVotosIdx = louvorCongIndex !== -1 ? louvorCongIndex : 0;
        initialItems.splice(insertVotosIdx, 0, {
          emoji: '💧',
          title: `Votos Batismais: Candidato(s)`,
          duration: 5,
          person: null
        });
        
        const sermaoIndex = initialItems.findIndex(i => i.title.toLowerCase().includes('sermão') || i.title.toLowerCase().includes('pregação'));
        let insertBatismoIdx = initialItems.length;
        
        if (sermaoIndex !== -1) {
          insertBatismoIdx = sermaoIndex + 1;
        } else {
          const finalPrayerIndex = initialItems.findIndex(i => i.title.toLowerCase().includes('oração final'));
          if (finalPrayerIndex !== -1) insertBatismoIdx = finalPrayerIndex;
        }
        
        initialItems.splice(insertBatismoIdx, 0, {
          emoji: '💧',
          title: `Cerimônia de Batismo`,
          duration: 10,
          person: null
        });
      }
    }

    let lid = existingLiturgyId;
    if (!lid) {
      try {
        const newLit = await createLiturgyAdmin(eventId as string, ev.start_time);
        lid = newLit.id;
        setLiturgyId(lid || null);
      } catch (litErr) {
        throw litErr;
      }
    }

    const newItems: LocalLiturgyItem[] = initialItems.map((item, idx) => {
      const t = (item.title || '').toLowerCase();
      const isLouvorGroup = t.includes('louvor') && !t.includes('especial');
      
      let singersStr = '';
      if (isLouvorGroup) {
         const leaderNameFull = findPeopleNames(['Líder de Louvor', 'Música']) || ev.worship_leader?.name;
         const leaderName = leaderNameFull ? leaderNameFull.split(' ')[0] : null;
         
         const teamNamesFull = ev.participants?.filter((p: any) => {
            const rn = p.role?.name?.toLowerCase() || '';
            return rn.includes('congregacional') || rn === 'vocal' || rn.includes('equipe');
         }).map((p: any) => p.person?.name).filter(Boolean);
         
         const teamNames = teamNamesFull?.length > 0 ? teamNamesFull.map((n: string) => n.split(' ')[0]).join(', ') : null;
         
         const parts = [];
         if (leaderName) parts.push(`Responsável: ${leaderName}`);
         if (teamNames) parts.push(`Equipe: ${teamNames}`);
         singersStr = parts.join(' | ');
      }
      
      return {
        title: item.title,
        duration_minutes: item.duration,
        order_index: idx + 1,
        person_id: isLouvorGroup ? null : (item.person?.id || null),
        person_name: isLouvorGroup ? '' : (item.person?.name || ''),
        emoji: item.emoji,
        notes: '',
        is_list: isLouvorGroup,
        list_data: isLouvorGroup ? { singers: singersStr, songs: ['', '', ''] } : { singers: '', songs: [''] }
      };
    });

    const calculated = calculateLiturgyTimes(newItems, ev.start_time) as LocalLiturgyItem[];
    setItems(calculated);
    
    // Save to DB silently
    saveToDb(lid!, calculated);
  };

  const saveToDb = async (lid: string, currentItems: LocalLiturgyItem[]) => {
    // Insert new
    const toInsert = currentItems.map(i => {
      let finalNotes = i.notes || null;
      if (i.is_list && i.list_data) {
         const validSongs = i.list_data.songs.filter(s => s.trim());
         if (validSongs.length > 0 || i.list_data.singers.trim()) {
           finalNotes = JSON.stringify({ singers: i.list_data.singers, songs: validSongs });
         }
      }
      return {
        liturgy_id: lid,
        title: i.title,
        duration_minutes: i.duration_minutes,
        order_index: i.order_index,
        responsible_person_id: i.person_id || null,
        calculated_time: i.calculated_time,
        notes: finalNotes
      };
    });
    
    try {
      await saveLiturgyItemsAdmin(lid, toInsert);
    } catch (err) {
      console.error('Error auto-saving liturgy items:', err);
    }
  };

  const handleUpdateItem = (index: number, field: keyof LocalLiturgyItem, value: any, extraPersonName?: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto toggle list mode based on title
    if (field === 'title') {
      const t = (value || '').toLowerCase();
      const isLouvorGroup = t.includes('louvor') && !t.includes('especial');
      newItems[index].is_list = isLouvorGroup;
      if (isLouvorGroup && !newItems[index].list_data) {
        newItems[index].list_data = { singers: '', songs: ['', '', ''] };
      }
    }

    if (extraPersonName !== undefined) {
      newItems[index].person_name = extraPersonName;
    }
    const calculated = calculateLiturgyTimes(newItems, event.start_time) as LocalLiturgyItem[];
    setItems(calculated);
  };

  const handleUpdateListSingers = (itemIndex: number, value: string) => {
    const newItems = [...items];
    const data = newItems[itemIndex].list_data || { singers: '', songs: [] };
    newItems[itemIndex].list_data = { ...data, singers: value };
    setItems(newItems);
  };

  const handleUpdateListSong = (itemIndex: number, songIndex: number, value: string) => {
    const newItems = [...items];
    const data = newItems[itemIndex].list_data || { singers: '', songs: [] };
    const newSongs = [...data.songs];
    newSongs[songIndex] = value;
    newItems[itemIndex].list_data = { ...data, songs: newSongs };
    setItems(newItems);
  };

  const handleAddListSong = (itemIndex: number) => {
    const newItems = [...items];
    const data = newItems[itemIndex].list_data || { singers: '', songs: [] };
    newItems[itemIndex].list_data = { ...data, songs: [...data.songs, ''] };
    setItems(newItems);
  };

  const handleRemoveListSong = (itemIndex: number, songIndex: number) => {
    const newItems = [...items];
    const data = newItems[itemIndex].list_data || { singers: '', songs: [] };
    const newSongs = [...data.songs];
    newSongs.splice(songIndex, 1);
    newItems[itemIndex].list_data = { ...data, songs: newSongs };
    setItems(newItems);
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
    const soundFirstName = event.sound_person?.name ? event.sound_person.name.split(' ')[0] : '';
    const sound = soundFirstName ? `🖥️ Sonoplastia: ${soundFirstName}\n\n` : `🖥️ Sonoplastia: ---\n\n`;
    
    const body = items.map(item => {
      // Determine emoji fallback based on text
      let emoji = item.emoji;
      if (!emoji) {
        const titleLower = (item.title || '').toLowerCase();
        if (titleLower.includes('oração') || titleLower.includes('orar')) emoji = '🙏';
        else if (titleLower.includes('louvor') || titleLower.includes('hino') || titleLower.includes('cantar')) emoji = '🎼';
        else if (titleLower.includes('sermão') || titleLower.includes('pregação') || titleLower.includes('mensagem')) emoji = '📖';
        else if (titleLower.includes('oferta') || titleLower.includes('dízimo')) emoji = '💰';
        else if (titleLower.includes('anúncio')) emoji = '📣';
        else if (titleLower.includes('história') || titleLower.includes('criança')) emoji = '🧸';
        else emoji = '🔸';
      }
      
      const firstName = item.person_name ? item.person_name.split(' ')[0] : '';
      let personStr = firstName ? ` (${firstName})` : '';
      
      let notesStr = '';
      if (item.is_list && item.list_data) {
        if (item.list_data.singers) {
          // If they typed singers, we replace the "personStr" with the singers text directly.
          // In their print, it was "Louvores Congregacionais Equipe de louvor"
          personStr = ` ${item.list_data.singers}`;
        }
        const validSongs = item.list_data.songs.filter(s => s.trim());
        if (validSongs.length > 0) {
          notesStr = '\n' + validSongs.map(song => {
            const prefix = song.toLowerCase().includes('hino') ? '*Hino:' : '*Hino:';
            // If they already typed "Hino:", don't duplicate it. But they wanted exact formatting.
            const displaySong = song.toLowerCase().startsWith('hino') ? song : `*Hino: ${song}`;
            return `▪️ ${displaySong}`;
          }).join('\n');
        }
      } else if (item.notes) {
        notesStr = `\n▪️ ${item.notes.replace(/\n/g, '\n▪️ ')}`;
      }
      
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
        <div className="flex justify-center p-8"><div className="spinner">Carregando...</div></div>
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

                {!item.is_list && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Responsável (Opcional)</span>
                        {!item.person_id && item.id && (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                            title="Copiar Link de Preenchimento para enviar"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const link = `${window.location.origin}/convite/liturgia/${item.id}`;
                              await navigator.clipboard.writeText(link);
                              setCopiedId(item.id || null);
                              addToast({ type: 'success', title: 'Link copiado!' });
                              setTimeout(() => setCopiedId(null), 3000);
                            }}
                          >
                            {copiedId === item.id ? '✅ Copiado' : '🔗 Copiar Link'}
                          </button>
                        )}
                      </label>
                      <div className="liturgy-item-person">
                        <PersonSelect 
                          value={item.person_id || ''} 
                          onChange={(val, person) => handleUpdateItem(idx, 'person_id', val, person?.name || '')}
                          placeholder="Buscar pessoa..."
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {item.is_list ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: 'var(--background-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>

                    
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Cantores (Equipe que vai puxar os hinos)</span>
                        {item.id && (
                          <button
                            className="btn btn-success btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                            title="Copiar Link de Preenchimento para enviar à equipe"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const link = `${window.location.origin}/convite/liturgia/${item.id}`;
                              await navigator.clipboard.writeText(link);
                              setCopiedId(item.id || null);
                              addToast({ type: 'success', title: 'Link copiado!' });
                              setTimeout(() => setCopiedId(null), 3000);
                            }}
                          >
                            {copiedId === item.id ? '✅ Copiado' : '🔗 Copiar Link'}
                          </button>
                        )}
                      </label>
                      <input 
                        type="text" 
                        className="form-input form-input-sm" 
                        placeholder="Ex: Natan, Maria e João" 
                        value={item.list_data?.singers || ''} 
                        onChange={e => handleUpdateListSingers(idx, e.target.value)}
                        style={{ fontSize: '0.9rem', fontWeight: 500 }}
                      />
                    </div>

                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                      Hinos
                    </label>
                    {(item.list_data?.songs || []).map((song, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="text" 
                            className="form-input form-input-sm" 
                            placeholder="Ex: Vem Espírito Santo (585 NHA)" 
                            value={song} 
                            onChange={e => handleUpdateListSong(idx, sIdx, e.target.value)}
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--text-danger)' }} onClick={() => handleRemoveListSong(idx, sIdx)}>✖</button>
                      </div>
                    ))}
                    <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: 'var(--primary)' }} onClick={() => handleAddListSong(idx)}>
                      + Adicionar Hino
                    </button>
                  </div>
                ) : (
                  <textarea
                    className="form-input"
                    style={{ fontSize: '0.85rem', backgroundColor: 'var(--background-secondary)', border: '1px dashed var(--border)', resize: 'vertical', minHeight: '40px' }}
                    placeholder="Detalhes (ex: Título da Música)"
                    value={item.notes || ''}
                    onChange={(e) => handleUpdateItem(idx, 'notes', e.target.value)}
                    rows={1}
                  />
                )}
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
