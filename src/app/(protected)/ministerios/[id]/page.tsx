'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import PersonSelect from '@/components/ui/PersonSelect';
import { Landmark, Trash2, Crown, Calendar as CalendarIcon, Users, Mic } from 'lucide-react';
import type { Ministry, Person, ChurchEvent } from '@/lib/types';

export default function MinisterioDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [singersSolo, setSingersSolo] = useState<any[]>([]);
  const [singersCongregational, setSingersCongregational] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'agenda' | 'equipe' | 'cantores'>('agenda');

  // Modal add member
  const [modalOpen, setModalOpen] = useState(false);
  const [newPersonId, setNewPersonId] = useState('');
  const [isLeader, setIsLeader] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch Ministry
    const { data: minData, error: minError } = await supabase
      .from('ministries')
      .select('*')
      .eq('id', params.id as string)
      .single();

    if (minError || !minData) {
      addToast({ type: 'error', title: 'Ministério não encontrado' });
      router.push('/ministerios');
      return;
    }
    setMinistry(minData);

    // Fetch Members
    const { data: membersData } = await supabase
      .from('person_ministries')
      .select('*, person:people(*)')
      .eq('ministry_id', params.id as string)
      .order('is_leader', { ascending: false });

    setMembers(membersData || []);

    // Fetch Events for Agenda
    const { data: eventsData } = await supabase
      .from('events')
      .select('*, event_type:event_types(*), location:locations(*)')
      .eq('ministry_id', params.id as string)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(10);
      
    setEvents((eventsData || []) as ChurchEvent[]);

    // Determine if we should show singers (check if ministry is related to music/worship)
    const isMusic = minData.name.toLowerCase().includes('louvor') || minData.name.toLowerCase().includes('música');
    if (isMusic) {
      // Fetch people with Cantor(a) Solo
      const { data: soloData } = await supabase
        .from('person_roles')
        .select('*, person:people(*), role:roles(*)')
        .eq('role.name', 'Cantor(a) Solo');
        
      // Fetch people with Cantor(a) Congregacional
      const { data: congData } = await supabase
        .from('person_roles')
        .select('*, person:people(*), role:roles(*)')
        .eq('role.name', 'Cantor(a) Congregacional');
        
      setSingersSolo((soloData || []).filter((s: any) => s.role));
      setSingersCongregational((congData || []).filter((s: any) => s.role));
    }

    setLoading(false);
  }, [params.id, supabase, addToast, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonId) {
      addToast({ type: 'error', title: 'Selecione uma pessoa' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('person_ministries').insert({
        person_id: newPersonId,
        ministry_id: params.id as string,
        is_leader: isLeader
      });
      if (error) {
        if (error.code === '23505') addToast({ type: 'error', title: 'Pessoa já está neste ministério' });
        else throw error;
      } else {
        addToast({ type: 'success', title: 'Membro adicionado!' });
        setModalOpen(false);
        setNewPersonId('');
        setIsLeader(false);
        fetchData();
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao adicionar membro' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLeader = async (memberId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('person_ministries')
      .update({ is_leader: !currentStatus })
      .eq('id', memberId);
    if (!error) fetchData();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Deseja realmente remover esta pessoa do ministério?')) return;
    const { error } = await supabase.from('person_ministries').delete().eq('id', memberId);
    if (error) addToast({ type: 'error', title: 'Erro ao remover' });
    else fetchData();
  };

  if (loading) return <div className="loading-page"><div className="spinner spinner-lg" /></div>;
  if (!ministry) return null;

  return (
    <>
      <Header title={ministry.name} onMenuToggle={() => {}}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/ministerios')}>
          Voltar
        </button>
      </Header>

      <div className="app-content">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
            <button 
              className={`btn ${activeTab === 'agenda' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('agenda')}
            >
              <CalendarIcon size={18} /> Agenda do Ministério
            </button>
            <button 
              className={`btn ${activeTab === 'equipe' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('equipe')}
            >
              <Users size={18} /> Responsáveis e Equipe
            </button>
            {(ministry.name.toLowerCase().includes('louvor') || ministry.name.toLowerCase().includes('música')) && (
              <button 
                className={`btn ${activeTab === 'cantores' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('cantores')}
              >
                <Mic size={18} /> Banco de Cantores
              </button>
            )}
          </div>
          
          {/* Tab: Agenda */}
          {activeTab === 'agenda' && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Próximos Eventos</h2>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => window.print()}
                  title="Gerar PDF ou Imagem da Escala"
                >
                  🖨️ Exportar Escala
                </button>
              </div>
              
              <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--background-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 600 }}>Status da Escala:</span>
                  <span className="badge" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                    ⚠️ Alguns eventos podem não ter Cantor Solo definido
                  </span>
                </div>
              </div>

              {events.length === 0 ? (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  Nenhum evento agendado sob a responsabilidade deste ministério.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {events.map(event => (
                    <div key={event.id} style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 'var(--space-4)' }}>
                      <div style={{ textAlign: 'center', minWidth: '60px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                          {new Date(event.date).toLocaleDateString('pt-BR', { month: 'short' })}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>
                          {new Date(event.date).getDate()}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{event.title}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {event.start_time.substring(0, 5)} {event.location ? `• ${event.location.name}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Equipe */}
          {activeTab === 'equipe' && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Landmark size={20} color={ministry.color || 'var(--primary)'} />
                  <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Equipe do Ministério ({members.length})</h2>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
                  ➕ Adicionar Membro
                </button>
              </div>
            
            {members.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                Nenhuma pessoa adicionada a este ministério ainda.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pessoa</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Função</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 500 }}>
                        {m.person?.name}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {m.is_leader ? (
                          <span className="badge" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
                            <Crown size={12} style={{ marginRight: 4 }} /> Líder
                          </span>
                        ) : (
                          <span className="badge badge-neutral">Membro</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => handleToggleLeader(m.id, m.is_leader)}
                          title={m.is_leader ? "Remover Liderança" : "Tornar Líder"}
                        >
                          <Crown size={16} color={m.is_leader ? "var(--text-tertiary)" : "var(--warning)"} />
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ color: 'var(--danger)' }} 
                          onClick={() => handleRemoveMember(m.id)}
                          title="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            </div>
          )}

          {/* Tab: Cantores */}
          {activeTab === 'cantores' && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <Mic size={20} color="var(--primary)" />
                  <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Banco de Cantores</h2>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => router.push('/admin/configuracoes')}>
                  Gerenciar Funções
                </button>
              </div>
              
              <div style={{ padding: 'var(--space-4)' }}>
                
                {/* Cantores Solo */}
                <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)', color: 'var(--primary)' }}>🎤 Cantores Solos</h3>
                {singersSolo.length === 0 ? (
                  <div style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', textAlign: 'center', color: 'var(--text-tertiary)', backgroundColor: 'var(--background-secondary)', borderRadius: 'var(--radius-md)' }}>
                    Nenhum cantor com a função "Cantor(a) Solo".
                  </div>
                ) : (
                  <table className="data-table" style={{ marginBottom: 'var(--space-6)' }}>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Contato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {singersSolo.map(s => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 500 }}>{s.person?.name}</td>
                          <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {s.person?.whatsapp || s.person?.email || 'Sem contato'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Cantores Congregacionais */}
                <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)', color: 'var(--primary)' }}>🎼 Cantores Congregacionais (Louvor)</h3>
                {singersCongregational.length === 0 ? (
                  <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-tertiary)', backgroundColor: 'var(--background-secondary)', borderRadius: 'var(--radius-md)' }}>
                    Nenhum cantor com a função "Cantor(a) Congregacional".
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Contato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {singersCongregational.map(s => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 500 }}>{s.person?.name}</td>
                          <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {s.person?.whatsapp || s.person?.email || 'Sem contato'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                
              </div>
            </div>
          )}
        </div>

        {/* Modal Add Member */}
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Adicionar Membro">
          <form onSubmit={handleAddMember}>
            <div className="form-group">
              <label className="form-label">Pessoa *</label>
              <PersonSelect 
                value={newPersonId} 
                onChange={val => setNewPersonId(val || '')} 
                placeholder="Busque pelo nome..." 
              />
            </div>
            <div className="form-checkbox-group" style={{ marginBottom: 'var(--space-6)' }}>
              <input 
                type="checkbox" 
                id="is_leader" 
                className="form-checkbox" 
                checked={isLeader} 
                onChange={e => setIsLeader(e.target.checked)} 
              />
              <label htmlFor="is_leader" className="form-checkbox-label">Esta pessoa é Líder deste ministério</label>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}
