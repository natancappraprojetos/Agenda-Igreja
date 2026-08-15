'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import PersonSelect from '@/components/ui/PersonSelect';
import { Landmark, Trash2, Crown } from 'lucide-react';
import type { Ministry, Person } from '@/lib/types';

export default function MinisterioDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [members, setMembers] = useState<any[]>([]);

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
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/ministerios')} style={{ marginRight: '8px' }}>
          Voltar
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
          ➕ Adicionar Membro
        </button>
      </Header>

      <div className="app-content">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          
          {/* Members Table */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Landmark size={20} color={ministry.color || 'var(--primary)'} />
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Equipe do Ministério ({members.length})</h2>
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
        </div>

        {/* Modal Add Member */}
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Adicionar Membro">
          <form onSubmit={handleAddMember}>
            <div className="form-group">
              <label className="form-label">Pessoa *</label>
              <PersonSelect 
                value={newPersonId} 
                onChange={setNewPersonId} 
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
