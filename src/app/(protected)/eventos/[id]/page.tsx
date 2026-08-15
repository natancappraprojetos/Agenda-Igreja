'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import Header from '@/components/layout/Header';
import PersonSelect from '@/components/ui/PersonSelect';
import LiturgyEditor from './LiturgyEditor';

export default function EventoDetalhesPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();
  const { isAdmin, isLeadership } = useAuth();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'resumo' | 'equipe' | 'liturgia'>('resumo');

  // Liturgy & Team data
  const [participants, setParticipants] = useState<any[]>([]);
  const [liturgyItems, setLiturgyItems] = useState<any[]>([]);
  
  // Auxiliary Lookups
  const [roles, setRoles] = useState<any[]>([]);
  const [itemTypes, setItemTypes] = useState<any[]>([]);

  // Add Participant Form
  const [newParticipantRoleId, setNewParticipantRoleId] = useState('');
  const [newParticipantPersonId, setNewParticipantPersonId] = useState('');

  // Add Liturgy Item Form
  const [newItemTypeId, setNewItemTypeId] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDuration, setNewItemDuration] = useState(5);
  const [newItemPersonId, setNewItemPersonId] = useState('');

  useEffect(() => {
    fetchEventData();
    fetchLookups();
  }, [params.id]);

  const fetchLookups = async () => {
    const [rolesRes, typesRes] = await Promise.all([
      supabase.from('roles').select('*').eq('is_active', true).order('name'),
      supabase.from('liturgy_item_types').select('*').eq('is_active', true).order('name')
    ]);
    if (rolesRes.data) setRoles(rolesRes.data);
    if (typesRes.data) setItemTypes(typesRes.data);
  };

  const fetchEventData = async () => {
    setLoading(true);
    const { data: eventData, error } = await supabase
      .from('events')
      .select(`
        *,
        event_type:event_types(name, icon, color),
        location:locations(name),
        ministry:ministries(name),
        responsible:people!events_responsible_person_id_fkey(name)
      `)
      .eq('id', params.id)
      .single();

    if (error || !eventData) {
      addToast({ type: 'error', title: 'Evento não encontrado' });
      router.push('/agenda');
      return;
    }

    setEvent(eventData);

    // Fetch Participants
    const { data: parts } = await supabase
      .from('event_participants')
      .select('*, role:roles(name), person:people(name, whatsapp)')
      .eq('event_id', params.id);
    if (parts) setParticipants(parts);

    // Fetch Liturgy (if exists)
    const { data: lit } = await supabase
      .from('liturgies')
      .select('id, start_time')
      .eq('event_id', params.id)
      .single();

    if (lit) {
      const { data: items } = await supabase
        .from('liturgy_items')
        .select('*, person:people(name), song:songs(title, artist)')
        .eq('liturgy_id', lit.id)
        .order('sort_order');
      if (items) setLiturgyItems(items);
    }

    setLoading(false);
  };

  const handleAddParticipant = async () => {
    if (!newParticipantRoleId || !newParticipantPersonId) {
      addToast({ type: 'error', title: 'Selecione a função e a pessoa' });
      return;
    }
    try {
      const { error } = await supabase.from('event_participants').insert({
        event_id: params.id,
        role_id: newParticipantRoleId,
        person_id: newParticipantPersonId
      });
      if (error) throw error;
      addToast({ type: 'success', title: 'Pessoa escalada com sucesso!' });
      setNewParticipantRoleId('');
      setNewParticipantPersonId('');
      fetchEventData();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao escalar pessoa' });
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm('Remover esta pessoa da escala?')) return;
    await supabase.from('event_participants').delete().eq('id', participantId);
    fetchEventData();
  };

  const handleDeleteEvent = async () => {
    if (!confirm('TEM CERTEZA que deseja excluir este evento? Esta ação não pode ser desfeita e removerá todas as escalas e liturgias associadas.')) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('events').delete().eq('id', params.id);
      if (error) throw error;
      addToast({ type: 'success', title: 'Evento excluído com sucesso!' });
      router.push('/admin'); // Ou para a página inicial
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao excluir o evento.' });
      setLoading(false);
    }
  };

  const shareToWhatsApp = () => {
    if (!event) return;
    
    let text = `🗓 *${event.title}*\n`;
    text += `📅 Data: ${new Date(event.date).toLocaleDateString('pt-BR')}\n`;
    text += `⏰ Início: ${event.start_time.substring(0,5)}\n`;
    if (event.location) text += `📍 Local: ${event.location.name}\n`;
    text += `\n*👥 ESCALA*\n`;
    
    participants.forEach(p => {
      text += `- ${p.role?.name}: ${p.person?.name}\n`;
    });

    if (liturgyItems.length > 0) {
      text += `\n*📖 PROGRAMAÇÃO*\n`;
      liturgyItems.forEach(i => {
        text += `[${i.calculated_time?.substring(0,5) || '--:--'}] ${i.title}`;
        if (i.person) text += ` (${i.person.name})`;
        text += `\n`;
      });
    }

    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  if (loading) return <div className="loading-page"><div className="spinner spinner-lg" /></div>;
  if (!event) return null;

  return (
    <>
      <Header title={event.title} onMenuToggle={() => {}}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/agenda')} style={{ marginRight: '8px' }}>
          Voltar
        </button>
        {(isAdmin || isLeadership) && (
          <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/eventos/${params.id}/editar`)} style={{ marginRight: '8px' }}>
            Editar
          </button>
        )}
        <button className="btn btn-primary btn-sm" onClick={shareToWhatsApp}>
          Compartilhar no WhatsApp 💬
        </button>
      </Header>

      <div className="app-content">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
          <button className={`btn ${activeTab === 'resumo' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('resumo')}>
            Resumo do Evento
          </button>
          <button className={`btn ${activeTab === 'equipe' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('equipe')}>
            Escalas & Equipe ({participants.length})
          </button>
          <button className={`btn ${activeTab === 'liturgia' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('liturgia')}>
            Liturgia & Ordem
          </button>
        </div>

        {/* Tab: RESUMO */}
        {activeTab === 'resumo' && (
          <div className="card" style={{ padding: 'var(--space-6)', maxWidth: 800 }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>{event.event_type?.icon} {event.event_type?.name}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <p className="form-label">Data e Hora</p>
                <p style={{ fontWeight: 600 }}>{new Date(event.date).toLocaleDateString('pt-BR')} às {event.start_time.substring(0, 5)}</p>
              </div>
              <div>
                <p className="form-label">Local</p>
                <p style={{ fontWeight: 600 }}>{event.location?.name || 'Não definido'}</p>
              </div>
              <div>
                <p className="form-label">Ministério</p>
                <p style={{ fontWeight: 600 }}>{event.ministry?.name || 'Geral'}</p>
              </div>
              <div>
                <p className="form-label">Responsável</p>
                <p style={{ fontWeight: 600 }}>{event.responsible?.name || 'Não definido'}</p>
              </div>
            </div>
            
            {(event.needs_sound || event.needs_worship || event.needs_deaconry) && (
              <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-color)' }}>
                <p className="form-label" style={{ marginBottom: 'var(--space-2)' }}>Requisitos Solicitados:</p>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {event.needs_sound && <span className="badge badge-neutral">🎧 Som/Mídia</span>}
                  {event.needs_worship && <span className="badge badge-neutral">🎵 Louvor</span>}
                  {event.needs_deaconry && <span className="badge badge-neutral">🤝 Diaconato</span>}
                </div>
              </div>
            )}

            {(isAdmin || isLeadership) && (
              <div style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-danger)', textAlign: 'right' }}>
                <button onClick={handleDeleteEvent} className="btn btn-danger">
                  🗑️ Excluir Evento Permanentemente
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: EQUIPE */}
        {activeTab === 'equipe' && (
          <div style={{ maxWidth: 800 }}>
            <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Escalar Integrante</h3>
              <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Função (Ex: Ministro de Louvor, Pregador)</label>
                  <select className="form-input" value={newParticipantRoleId} onChange={e => setNewParticipantRoleId(e.target.value)}>
                    <option value="">Selecione a função...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <PersonSelect 
                    label="Pessoa (Busque ou cadastre)" 
                    value={newParticipantPersonId} 
                    onChange={setNewParticipantPersonId} 
                  />
                </div>
                <button className="btn btn-primary" onClick={handleAddParticipant}>Adicionar</button>
              </div>
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>Escala Atual</h3>
            {participants.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>Nenhuma pessoa escalada para este evento ainda.</p>
            ) : (
              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Função</th>
                      <th>Pessoa</th>
                      <th>WhatsApp</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.role?.name}</td>
                        <td>{p.person?.name}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{p.person?.whatsapp || '—'}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveParticipant(p.id)}>
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: LITURGIA */}
        {activeTab === 'liturgia' && (
          <LiturgyEditor 
            eventId={event.id}
            eventStartTime={event.start_time}
            itemTypes={itemTypes}
          />
        )}

      </div>
    </>
  );
}
