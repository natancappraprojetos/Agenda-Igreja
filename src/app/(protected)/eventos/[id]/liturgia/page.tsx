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
import html2canvas from 'html2canvas';
import Header from '@/components/layout/Header';

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

function fixCapitalization(str: string): string {
  const lowercaseWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em'];
  return str
    .split(/\s+/)
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx > 0 && lowercaseWords.includes(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function formatName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();

  // 1. Se tem ' e ' ou ' & ' (casais, duplas, parcerias: ex: "Felipe e Aline", "Jurema e a Soelsi") -> manter completo
  if (/\s+(e|&)\s+/i.test(trimmed)) {
    return fixCapitalization(trimmed);
  }

  // 2. Se for grupo, banda, trio, ministério, coral, equipe, etc. -> manter completo
  const groupPattern = /^(trio|grupo|banda|quarteto|coral|equipe|minist[eé]rio|conjunto|fam[ií]lia|dupla|jovens|professores|professor|pastores|pastor|anci[aã]os|anci[aã]o|di[aá]conos|diaconisas|desbravadores|aventureiros)\b/i;
  if (groupPattern.test(trimmed)) {
    return fixCapitalization(trimmed);
  }

  const parts = trimmed.split(/\s+/);
  
  // 3. Se tiver até 3 palavras (ex: 'Sheila de Matos', 'Darci de Jesus', 'Ana Paula Souza') -> nunca cortar!
  if (parts.length <= 3) {
    return fixCapitalization(trimmed);
  }

  // 4. Se tiver 4 ou mais palavras, mas for curto (até 26 caracteres), mantém inteiro
  if (trimmed.length <= 26) {
    return fixCapitalization(trimmed);
  }

  const prepositions = ['de', 'da', 'do', 'das', 'dos', 'e'];
  const firstName = parts[0];
  const secondName = parts[1];
  
  // Nome composto tradicional (ex: João Pedro, Ana Paula, Maria Eduarda)
  const compoundFirst = ['pedro', 'paulo', 'maria', 'eduarda', 'clara', 'paula', 'luiza', 'luiz', 'lucas', 'vitor', 'victor', 'felipe', 'gabriel', 'henrique', 'guilherme', 'arthur', 'miguel', 'alice', 'beatriz', 'sophia', 'laura', 'valentina'];
  const hasCompound = compoundFirst.includes(secondName.toLowerCase()) && !prepositions.includes(secondName.toLowerCase());

  const prefix = hasCompound ? `${firstName} ${secondName}` : firstName;

  const lastIndex = parts.length - 1;
  const lastWord = parts[lastIndex];
  const secondToLast = parts[lastIndex - 1];

  let suffix = lastWord;
  // Se antes do último houver preposição (ex: 'dos Santos', 'de Matos'), preserva junto
  if (secondToLast && prepositions.includes(secondToLast.toLowerCase())) {
    suffix = `${secondToLast} ${lastWord}`;
  }

  if (prefix.toLowerCase().includes(lastWord.toLowerCase())) {
    return fixCapitalization(prefix);
  }

  return fixCapitalization(`${prefix} ${suffix}`);
}

function isCongregationalPraise(title: string): boolean {
  const t = (title || '').toLowerCase();
  return t.includes('congregaciona') || t.includes('momento de louvor') || t.includes('cânticos') || t.includes('canticos');
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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
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
            let listData = { singers: '', songs: ['', ''] };
            let textNotes = i.notes || '';
            
            if (textNotes.trim().startsWith('{') && textNotes.trim().endsWith('}')) {
              try {
                const parsed = JSON.parse(textNotes);
                if (parsed.songs && Array.isArray(parsed.songs)) {
                  listData = {
                    singers: parsed.singers || '',
                    songs: parsed.songs.length > 0 ? parsed.songs : ['', '']
                  };
                  isList = true;
                }
              } catch(e) {}
            } else if (isCongregationalPraise(t)) {
              isList = true;
            }
            
            if (isList && (!listData.singers || listData.singers === '')) {
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
            } else if ((t.includes('louvor especial') || t.includes('música especial') || t.includes('solo')) && (!pId || pId === evData.worship_leader_id)) {
               const solo = findPerson(['Solo', 'Cantor']);
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
              person_id: isList ? null : pId,
              person_name: isList ? '' : pName,
              notes: isList ? '' : textNotes,
              is_list: isList,
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

  const generateTemplate = async (ev: any, existingLiturgyId?: string, forcedTemplateType?: string) => {
    const title = (ev.title || '').toLowerCase();
    const date = new Date(ev.date + 'T00:00:00');
    const dayOfWeek = date.getDay(); 
    
    let isEvangelistico = forcedTemplateType === 'evangelistico' || 
      (!forcedTemplateType && (title.includes('evang') || title.includes('esperança') || title.includes('esperanca') || title.includes('semana') || title.includes('conferência') || title.includes('conferencia')));
    
    let isSantaCeia = forcedTemplateType === 'santaceia' ||
      (!forcedTemplateType && !isEvangelistico && (title.includes('santa ceia') || title.includes('ceia')));

    let isSabado = forcedTemplateType === 'sabado' || 
      (!forcedTemplateType && !isEvangelistico && !isSantaCeia && (title.includes('sáb') || title.includes('sabado') || dayOfWeek === 6));

    let isQuarta = forcedTemplateType === 'quarta' ||
      (!forcedTemplateType && !isEvangelistico && !isSantaCeia && (title.includes('quarta') || dayOfWeek === 3));

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

    if (isEvangelistico) {
      initialItems = [
        { emoji: '👋', title: 'Abertura e Boas-Vindas', duration: 3, person: ev.responsible_person },
        { emoji: '🎼', title: 'Momento de Louvor', duration: 8, person: ev.worship_leader, is_list: true },
        { emoji: '🙏', title: 'Oração Inicial', duration: 5, person: null },
        { emoji: '🎁', title: 'Sorteio', duration: 5, person: null },
        { emoji: '🎼', title: 'Louvor Inicial', duration: 4, person: ev.worship_leader },
        { emoji: '🎤', title: 'Música Especial', duration: 5, person: findPerson(['Solo', 'Cantor']) },
        { emoji: '📖', title: 'Pregação', duration: 30, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
        { emoji: '🎤', title: 'Música Especial (Apelo)', duration: 5, person: findPerson(['Solo', 'Cantor']) },
        { emoji: '🙏', title: 'Oração Final', duration: 3, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
        { emoji: '🤝', title: 'Confraternização / Lanche', duration: 5, person: null },
      ];
    } else if (isSantaCeia) {
      initialItems = [
        { emoji: '📘', title: 'Abertura da Escola Sabatina', duration: 10, person: findPerson(['Sabatina']) },
        { emoji: '🎼', title: 'Hino Inicial', duration: 3, person: null },
        { emoji: '🙏', title: 'Oração de Joelhos', duration: 2, person: null },
        { emoji: '🌍', title: 'Informativo Mundial das Missões', duration: 7, person: null },
        { emoji: '📘', title: 'Estudo da Lição nas Classes', duration: 30, person: { name: 'Professores' } },
        { emoji: '💼', title: 'Pastoreio nas Classes', duration: 10, person: { name: 'Professores' } },
        { emoji: '📣', title: 'Anúncios', duration: 5, person: findPerson(['Anúncios', 'Responsável']) || ev.responsible_person },
        { emoji: '👨‍👩‍👧‍👦', title: 'Momento da Família', duration: 5, person: null },
        { emoji: '💰', title: 'Momento de Fidelidade (Dízimos e Ofertas)', duration: 10, person: findPerson(['Oferta']) },
        { emoji: '🎼', title: 'Louvores Congregacionais', duration: 10, person: ev.worship_leader, is_list: true },
        { emoji: '🙏', title: 'Oração Inicial (de joelhos)', duration: 5, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
        { emoji: '🎤', title: 'Louvor Especial (Solo)', duration: 5, person: findPerson(['Solo', 'Cantor']) },
        { emoji: '📖', title: 'Sermão da Santa Ceia', duration: 30, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
        { emoji: '🍞', title: 'Cerimônia de Lava-Pés e Santa Ceia', duration: 25, person: ev.responsible_person },
        { emoji: '🎼', title: 'Louvor Final', duration: 5, person: findPerson(['Solo', 'Cantor']) || ev.worship_leader },
        { emoji: '🙏', title: 'Oração Final', duration: 3, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
      ];
    } else if (isSabado) {
      initialItems = [
        { emoji: '📘', title: 'Abertura da Escola Sabatina', duration: 10, person: findPerson(['Sabatina']) },
        { emoji: '🎼', title: 'Hino Inicial', duration: 3, person: null },
        { emoji: '🙏', title: 'Oração de Joelhos', duration: 2, person: null },
        { emoji: '🌍', title: 'Informativo Mundial das Missões', duration: 7, person: null },
        { emoji: '📘', title: 'Estudo da Lição nas Classes', duration: 30, person: { name: 'Professores' } },
        { emoji: '💼', title: 'Pastoreio nas Classes', duration: 10, person: { name: 'Professores' } },
        { emoji: '🎼', title: 'Louvor Especial', duration: 5, person: findPerson(['Solo', 'Cantor']) || ev.worship_leader },
        { emoji: '📣', title: 'Anúncios', duration: 5, person: findPerson(['Anúncios', 'Responsável']) || ev.responsible_person },
        { emoji: '👨‍👩‍👧‍👦', title: 'Momento da Família', duration: 5, person: null },
        { emoji: '🧸', title: 'História das crianças', duration: 5, person: findPerson(['História', 'Criança']) },
        { emoji: '💰', title: 'Provai e Vede + Ofertas', duration: 10, person: findPerson(['Oferta']) },
        { emoji: '🎼', title: 'Louvores Congregacionais', duration: 10, person: ev.worship_leader, is_list: true },
        { emoji: '🎤', title: 'Mensagem Musical', duration: 5, person: findPerson(['Solo', 'Cantor']) || ev.worship_leader },
        { emoji: '🙏', title: 'Oração Inicial (de joelhos)', duration: 5, person: null },
        { emoji: '📖', title: 'Sermão', duration: 35, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
        { emoji: '🎼', title: 'Louvor Final', duration: 5, person: findPerson(['Solo', 'Cantor']) || ev.worship_leader },
        { emoji: '🙏', title: 'Oração Final', duration: 3, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
      ];
    } else if (isQuarta) {
      initialItems = [
        { emoji: '🎼', title: 'Momento de Louvor', duration: 5, person: ev.worship_leader, is_list: true },
        { emoji: '🙏', title: 'Oração Inicial', duration: 5, person: null },
        { emoji: '🙏', title: 'Pedidos e agradecimentos', duration: 15, person: null },
        { emoji: '💰', title: 'Momento Fidelidade / Ofertas', duration: 5, person: findPerson(['Oferta']) },
        { emoji: '🎼', title: 'Louvor Inicial', duration: 4, person: ev.worship_leader },
        { emoji: '📖', title: 'Pregação', duration: 30, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
        { emoji: '🎼', title: 'Louvor Final', duration: 3, person: ev.worship_leader },
        { emoji: '🙏', title: 'Oração Final', duration: 3, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
      ];
    } else {
      // Domingo ou Padrão
      initialItems = [
        { emoji: '👋', title: 'Abertura e Boas-Vindas', duration: 3, person: ev.responsible_person },
        { emoji: '🎼', title: 'Momento de Louvor', duration: 8, person: ev.worship_leader, is_list: true },
        { emoji: '🙏', title: 'Oração Inicial', duration: 5, person: null },
        { emoji: '💰', title: 'Momento Fidelidade / Ofertas', duration: 5, person: findPerson(['Oferta']) },
        { emoji: '🎼', title: 'Louvor Inicial', duration: 4, person: ev.worship_leader },
        { emoji: '🎤', title: 'Música Especial', duration: 5, person: findPerson(['Solo', 'Cantor']) },
        { emoji: '📖', title: 'Pregação', duration: 30, person: findPerson(['Pregador', 'Sermão', 'Pregação']) || ev.preacher },
        { emoji: '🎼', title: 'Louvor Final', duration: 4, person: ev.worship_leader },
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
      const isList = Boolean(item.is_list);
      
      let singersStr = '';
      if (isList) {
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
        person_id: isList ? null : (item.person?.id || null),
        person_name: isList ? '' : (item.person?.name || ''),
        emoji: item.emoji,
        notes: '',
        is_list: isList,
        list_data: isList ? { singers: singersStr, songs: ['', ''] } : { singers: '', songs: [''] }
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

  const handleToggleListMode = (index: number) => {
    const newItems = [...items];
    const current = newItems[index];
    const nextIsList = !current.is_list;
    newItems[index] = {
      ...current,
      is_list: nextIsList,
      list_data: nextIsList 
        ? (current.list_data?.songs?.length ? current.list_data : { singers: current.person_name || '', songs: ['', ''] })
        : current.list_data
    };
    setItems(newItems);
  };

  const handleApplyTemplate = async (templateKey: string) => {
    if (items.length > 0) {
      if (!confirm('Deseja carregar este modelo? A lista de itens atual deste culto será substituída pelos itens do modelo selecionado.')) {
        return;
      }
    }
    await generateTemplate(event, liturgyId || undefined, templateKey);
    addToast({ type: 'success', title: 'Modelo aplicado com sucesso!' });
  };

  const handleUpdateItem = (index: number, field: keyof LocalLiturgyItem, value: any, extraPersonName?: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto toggle list mode based on title only if it's explicitly congregational praise
    if (field === 'title') {
      const t = (value || '').toLowerCase();
      if (isCongregationalPraise(t)) {
        newItems[index].is_list = true;
        if (!newItems[index].list_data || !newItems[index].list_data?.songs?.length) {
          newItems[index].list_data = { singers: '', songs: ['', ''] };
        }
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
        else if (titleLower.includes('sorteio')) emoji = '🎁';
        else if (titleLower.includes('confraternização') || titleLower.includes('lanche')) emoji = '🤝';
        else if (titleLower.includes('abertura') || titleLower.includes('boas-vindas') || titleLower.includes('boas vindas')) emoji = '👋';
        else if (titleLower.includes('louvor') || titleLower.includes('hino') || titleLower.includes('música') || titleLower.includes('cantar')) emoji = '🎼';
        else if (titleLower.includes('sermão') || titleLower.includes('pregação') || titleLower.includes('mensagem')) emoji = '📖';
        else if (titleLower.includes('oferta') || titleLower.includes('dízimo') || titleLower.includes('fidelidade')) emoji = '💰';
        else if (titleLower.includes('anúncio')) emoji = '📣';
        else if (titleLower.includes('história') || titleLower.includes('criança')) emoji = '🧸';
        else if (titleLower.includes('ceia') || titleLower.includes('lava-pés')) emoji = '🍞';
        else if (titleLower.includes('batismo')) emoji = '💧';
        else emoji = '🔸';
      }
      
      const formattedPerson = item.person_name ? formatName(item.person_name) : '';
      let personStr = formattedPerson ? ` (${formattedPerson})` : '';
      
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

  const handleDownloadImage = async () => {
    setIsGeneratingImage(true);
    setTimeout(async () => {
      const el = document.getElementById('liturgia-print-view');
      if (el) {
        try {
          const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false });
          const image = canvas.toDataURL('image/png', 1.0);
          const link = document.createElement('a');
          link.download = `Liturgia_${event?.title || 'Culto'}_${formatDateShort(event?.date || new Date()).replace(/\//g, '-')}.png`;
          link.href = image;
          link.click();
        } catch (err) {
          console.error('Error generating image', err);
          addToast({ type: 'error', title: 'Erro ao gerar imagem' });
        }
      }
      setIsGeneratingImage(false);
    }, 150);
  };

  if (loading || !event) {
    return (
      <div className="loading-page">
        <div className="flex justify-center p-8"><div className="spinner">Carregando...</div></div>
      </div>
    );
  }


  const isTwoColumns = items.length > 10;

  return (
    <>
      <Header title="Gerador de Liturgia" onBack={() => router.back()} onMenuToggle={() => {}}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={handleSave} disabled={saving} title="Salvar Liturgia">
            {saving ? 'Salvando...' : '💾'}
            <span className="hide-on-mobile"> Salvar</span>
          </button>
          <button className={`btn btn-${copied ? 'success' : 'primary'} btn-sm`} onClick={copyToWhatsApp} title="Copiar para WhatsApp">
            {copied ? '✅' : '📱'}
            <span className="hide-on-mobile"> {copied ? 'Copiado!' : 'Copiar WhatsApp'}</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleDownloadImage} disabled={isGeneratingImage} title="Gerar Imagem para WhatsApp">
            📸
            <span className="hide-on-mobile"> {isGeneratingImage ? 'Gerando...' : 'Imagem WhatsApp'}</span>
          </button>
        </div>
      </Header>

      <div className="app-content" style={{ maxWidth: '1050px', margin: '0 auto', width: '100%', paddingBottom: '100px' }}>
        <div className="card mb-4" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
          <h2 style={{ fontSize: '1.2rem', margin: '0 0 var(--space-2) 0' }}>{event.title}</h2>
          <p style={{ margin: 0, opacity: 0.9 }}>{formatDateShort(event.date)} • {formatTime(event.start_time)}</p>
        </div>

        {/* Seletor Rápido de Modelos */}
        <div className="card mb-4" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#475569' }}>📋 Carregar Modelo:</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 10px', backgroundColor: '#ffffff' }}
                onClick={() => handleApplyTemplate('evangelistico')}
                title="Modelo de Culto Evangelístico (sem ofertas, com sorteio e louvores pontuais)"
              >
                ✨ Culto Evangelístico
              </button>
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 10px', backgroundColor: '#ffffff' }}
                onClick={() => handleApplyTemplate('santaceia')}
                title="Modelo de Santa Ceia no Sábado (lava-pés, fidelidade e solo)"
              >
                🍞 Santa Ceia (Sábado)
              </button>
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 10px', backgroundColor: '#ffffff' }}
                onClick={() => handleApplyTemplate('sabado')}
                title="Culto tradicional de Sábado de manhã"
              >
                ⛪ Sábado Normal
              </button>
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 10px', backgroundColor: '#ffffff' }}
                onClick={() => handleApplyTemplate('quarta')}
                title="Culto de Oração de Quarta-feira"
              >
                🙏 Quarta-feira
              </button>
              <button 
                type="button" 
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.8rem', padding: '4px 10px', backgroundColor: '#ffffff' }}
                onClick={() => handleApplyTemplate('domingo')}
                title="Culto de Domingo à noite normal"
              >
                🕊️ Domingo Normal
              </button>
            </div>
          </div>
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

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={item.title} 
                    onChange={(e) => handleUpdateItem(idx, 'title', e.target.value)}
                    placeholder="Título do Item"
                    style={{ fontWeight: 600, flex: 1, minWidth: 0 }}
                  />
                  
                  <div style={{ width: '90px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
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

                {/* Alternador de Modo: Individual vs Lista de Hinos */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2px 0' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {item.is_list ? '🎤 Modo: Equipe de Louvor (Lista de Hinos)' : '👤 Modo: Pessoa / Cantor Individual'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.72rem', padding: '2px 6px', color: 'var(--primary)', height: 'auto', minHeight: 'auto' }}
                    onClick={() => handleToggleListMode(idx)}
                    title="Alternar entre modo Cantor Individual ou Lista de Hinos"
                  >
                    {item.is_list ? '👤 Mudar para Cantor Individual' : '🎤 Mudar para Lista de Hinos'}
                  </button>
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
                      Hinos (normalmente 2 hinos):
                    </label>
                    {(item.list_data?.songs || []).map((song, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <input 
                            type="text" 
                            className="form-input form-input-sm" 
                            placeholder={`Hino ${sIdx + 1} (ex: Vem Espírito Santo - 585 NHA)`} 
                            value={song} 
                            onChange={e => handleUpdateListSong(idx, sIdx, e.target.value)}
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--text-danger)' }} onClick={() => handleRemoveListSong(idx, sIdx)} title="Remover este hino">✖</button>
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', fontSize: '0.8rem', color: 'var(--primary)' }} onClick={() => handleAddListSong(idx)}>
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

          {items.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                type="button"
                className="btn btn-outline" 
                style={{ padding: '10px 16px', borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: '8px' }} 
                onClick={() => addItem(items.length - 1)}
              >
                ➕ Adicionar Novo Item à Liturgia
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : '💾 Salvar Liturgia'}
                </button>
                <button className={`btn btn-${copied ? 'success' : 'primary'} btn-sm`} onClick={copyToWhatsApp}>
                  {copied ? '✅ Copiado!' : '📱 Copiar WhatsApp'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isGeneratingImage && (
        <div 
          id="liturgia-print-view" 
          style={{ 
            position: 'absolute', top: 0, left: 0, width: isTwoColumns ? '920px' : '480px', 
            background: 'white', padding: '30px', color: 'black', 
            zIndex: -100, fontFamily: 'sans-serif'
          }}
        >
          {/* Header styling */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #f3f4f6' }}>
            <img src="/icon.jpg" alt="Logo" style={{ width: '60px', height: '60px', borderRadius: '16px', objectFit: 'cover', border: '2px solid #e5e7eb' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <h2 style={{ fontSize: '26px', margin: '0 0 4px 0', color: '#1f2937', fontFamily: 'Georgia, serif', fontWeight: 800 }}>{event.title}</h2>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span style={{ marginRight: '12px' }}>📅 {formatDateShort(event.date)}</span>
                <span>⏰ {formatTime(event.start_time)}</span>
              </div>
            </div>
            <div style={{ width: '60px' }}></div> {/* Spacer for centering */}
          </div>

          {/* Sonoplasta */}
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '24px' }}>🔊</span>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>Sonoplastia do dia</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                {event.sound_person?.name || event.participants?.find((p: any) => p.role?.name?.toLowerCase().includes('sonoplasta'))?.person?.name || 'A Definir'}
              </div>
            </div>
          </div>
          
          {/* Items Container */}
          <div style={{ columnCount: isTwoColumns ? 2 : 1, columnGap: '16px' }}>
            {items.map((item, idx) => (
               <div key={item.id || idx} style={{ display: 'flex', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '10px 16px', gap: '16px', breakInside: 'avoid', pageBreakInside: 'avoid', marginBottom: '8px' }}>
                 
                 <div style={{ fontWeight: 800, fontSize: '17px', width: '50px', color: '#4f46e5', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                   {formatTime(item.calculated_time)}
                 </div>
                 
                 <div style={{ width: '2px', background: '#cbd5e1', borderRadius: '2px' }}></div>
                 
                 <div style={{ flex: 1 }}>
                   <div style={{ fontWeight: 'bold', fontSize: '17px', color: '#0f172a' }}>{item.title}</div>
                   
                   {item.is_list && item.list_data && item.list_data.songs && (item.list_data.songs.some(s => s && s.trim()) || item.list_data.singers) ? (
                     <div style={{ marginTop: '6px', background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                       <div style={{ fontSize: '13px', color: '#475569', fontWeight: 700, marginBottom: '2px' }}>🎤 {item.list_data.singers || 'Equipe'}:</div>
                       <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#334155' }}>
                         {item.list_data.songs.filter(s => s && s.trim()).map((song, i) => (
                           <li key={i} style={{ marginBottom: '2px' }}>{song}</li>
                         ))}
                       </ul>
                     </div>
                   ) : (
                     item.person_name && <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>👤 <span style={{ fontWeight: 600 }}>{formatName(item.person_name)}</span></div>
                   )}
                   
                   {item.notes && <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>📌 {item.notes}</div>}
                 </div>
                 
                 <div style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 700, alignSelf: 'flex-start', paddingTop: '4px' }}>{item.duration_minutes}m</div>
               </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
