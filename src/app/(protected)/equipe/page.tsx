'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import PersonAutocomplete from '@/components/ui/PersonAutocomplete';
import { Users, Trash2, Shield } from 'lucide-react';
import type { Role, Person } from '@/lib/types';

export default function EquipePage() {
  const { roles } = useAuth();
  const supabase = createClient();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dbRoles, setDbRoles] = useState<Role[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [newPersonId, setNewPersonId] = useState<string | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonWhatsapp, setNewPersonWhatsapp] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [saving, setSaving] = useState(false);

  // Determinar quais funções este líder pode gerenciar baseado no seu perfil de acesso
  const getRolesToManage = useCallback(() => {
    let rolesToManage: string[] = [];
    if (roles.includes('sonoplastia')) rolesToManage.push('Sonoplasta');
    if (roles.includes('diacono')) rolesToManage.push('Diácono', 'Diaconisa', 'Diácono/Diaconisa');
    if (roles.includes('musica')) rolesToManage.push('Cantor(a) Solo', 'Cantor(a) Congregacional', 'Instrumentista', 'Líder de Louvor', 'Cantor', 'Pianista', 'Violonista');
    if (roles.includes('anciao')) rolesToManage.push('Pregador', 'Pregador(a)', 'Ancião', 'Sonoplasta', 'Líder de Louvor', 'Diretor');
    return rolesToManage;
  }, [roles]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const roleNames = getRolesToManage();
    
    if (roleNames.length === 0) {
      setLoading(false);
      return;
    }

    // 1. Fetch Role IDs for the managed roles
    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .in('name', roleNames);
      
    if (rolesData) {
      setDbRoles(rolesData as Role[]);
      const roleIds = rolesData.map(r => r.id);

      if (roleIds.length > 0) {
        // 2. Fetch people who have these roles
        const { data: membersData } = await supabase
          .from('person_roles')
          .select('id, person_id, role_id, person:people(*), role:roles(*)')
          .in('role_id', roleIds);
          
        setTeamMembers(membersData || []);
        
        // Auto-select first role for the add modal
        if (rolesData.length > 0 && !selectedRoleId) {
          setSelectedRoleId(rolesData[0].id);
        }
      }
    }
    setLoading(false);
  }, [supabase, getRolesToManage, selectedRoleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) {
      addToast({ type: 'error', title: 'Informe o nome da pessoa' });
      return;
    }
    if (!selectedRoleId) {
      addToast({ type: 'error', title: 'Selecione uma função' });
      return;
    }

    setSaving(true);
    try {
      let finalPersonId = newPersonId;

      // Se a pessoa não foi selecionada da lista (nova pessoa), precisamos criá-la
      if (!finalPersonId) {
        // Primeiro verifica se a pessoa existe pelo nome (case insensitive) para evitar duplicatas
        const { data: existing } = await supabase
          .from('people')
          .select('*')
          .ilike('name', newPersonName.trim())
          .limit(1)
          .maybeSingle();

        if (existing) {
          finalPersonId = existing.id;
        } else {
          const { data: newPerson, error: createError } = await supabase
            .from('people')
            .insert({ name: newPersonName.trim(), whatsapp: newPersonWhatsapp.trim() || null })
            .select()
            .single();
            
          if (createError) throw createError;
          finalPersonId = newPerson.id;
        }
      }

      const { error } = await supabase.from('person_roles').insert({
        person_id: finalPersonId,
        role_id: selectedRoleId
      });

      if (error) {
        if (error.code === '23505') addToast({ type: 'error', title: 'Esta pessoa já tem esta função!' });
        else throw error;
      } else {
        addToast({ type: 'success', title: 'Membro adicionado à equipe!' });
        setModalOpen(false);
        setNewPersonId(null);
        setNewPersonName('');
        setNewPersonWhatsapp('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Erro ao adicionar membro' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (id: string, personName: string) => {
    if (!confirm(`Deseja realmente remover ${personName} desta função?`)) return;
    try {
      const { error } = await supabase.from('person_roles').delete().eq('id', id);
      if (error) throw error;
      addToast({ type: 'success', title: 'Membro removido da equipe' });
      fetchData();
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao remover' });
    }
  };

  const roleNames = getRolesToManage();

  return (
    <>
      <Header title="Minha Equipe" onMenuToggle={() => {}}>
        {roleNames.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}>
            ➕ Adicionar Membro
          </button>
        )}
      </Header>

      <div className="app-content">
        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : roleNames.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Shield size={48} color="var(--text-tertiary)" /></div>
            <div className="empty-state-title">Acesso Restrito</div>
            <p style={{ color: 'var(--text-secondary)' }}>Seu perfil de acesso não possui uma equipe específica configurada.</p>
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={48} color="var(--text-tertiary)" /></div>
            <div className="empty-state-title">Nenhum membro na equipe</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>Sua equipe está vazia. Adicione pessoas para poder escalá-las.</p>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>➕ Adicionar Membro</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Função</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map(member => (
                  <tr key={member.id}>
                    <td style={{ fontWeight: 500 }}>
                      {member.person?.name}
                      {member.person?.whatsapp && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                          {member.person.whatsapp}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-info">{member.role?.name}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ color: 'var(--danger)' }} 
                        onClick={() => handleRemoveMember(member.id, member.person?.name)}
                        title="Remover da equipe"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Adicionar à Equipe">
          <form onSubmit={handleAddMember}>
            {dbRoles.length > 1 && (
              <div className="form-group">
                <label className="form-label">Qual a função da pessoa? *</label>
                <select 
                  className="form-input" 
                  value={selectedRoleId} 
                  onChange={e => setSelectedRoleId(e.target.value)}
                  required
                >
                  {dbRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="form-group">
              <PersonAutocomplete 
                label="Nome da Pessoa *"
                placeholder="Nome completo..."
                onSelect={(person, name) => {
                  setNewPersonName(name);
                  if (person) {
                    setNewPersonId(person.id);
                    if (person.whatsapp) setNewPersonWhatsapp(person.whatsapp);
                  } else {
                    setNewPersonId(null);
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp (Opcional)</label>
              <input 
                type="text" 
                className="form-input" 
                value={newPersonWhatsapp} 
                onChange={e => setNewPersonWhatsapp(e.target.value)}
                placeholder="(DD) 90000-0000" 
              />
            </div>

            <div className="modal-actions" style={{ marginTop: 'var(--space-6)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setModalOpen(false); setNewPersonId(null); setNewPersonName(''); setNewPersonWhatsapp(''); }}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !newPersonName.trim()}>
                {saving ? 'Adicionando...' : 'Adicionar à Equipe'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}
