'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import ProtectedRoute from '@/components/ui/ProtectedRoute';
import { Users, Mail, Phone, Trash2 } from 'lucide-react';
import type { Person, Role, Ministry } from '@/lib/types';

export default function PessoasPage() {
  const [items, setItems] = useState<Person[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  
  const [activeTab, setActiveTab] = useState('Todos');

  const [editItem, setEditItem] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);
  const [isLeader, setIsLeader] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Buscar funções e ministérios
    const { data: rolesData } = await supabase.from('roles').select('*').order('name');
    if (rolesData) setRoles(rolesData as Role[]);
    
    const { data: minData } = await supabase.from('ministries').select('*').order('name');
    if (minData) setMinistries(minData as Ministry[]);

    // Buscar pessoas e seus relacionamentos
    const { data } = await supabase
      .from('people')
      .select('*, person_roles(role_id, roles(name, category)), person_ministries(ministry_id, is_leader, ministries(name))')
      .order('name');
      
    setItems((data || []) as Person[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => { 
    setName(''); 
    setWhatsapp(''); 
    setEmail(''); 
    setIsActive(true); 
    setSelectedRoles([]);
    setSelectedMinistries([]);
    setIsLeader(false);
    setEditItem(null); 
  };

  const openEdit = (item: Person) => {
    setEditItem(item); 
    setName(item.name); 
    setWhatsapp(item.whatsapp || '');
    setEmail(item.email || ''); 
    setIsActive(item.is_active); 
    
    // Mapear relacionamentos existentes para os arrays
    const personRoleIds = (item.person_roles || []).map((pr: any) => pr.role_id);
    setSelectedRoles(personRoleIds);
    
    const personMinIds = (item.person_ministries || []).map((pm: any) => pm.ministry_id);
    setSelectedMinistries(personMinIds);
    
    const isL = (item.person_ministries || []).some((pm: any) => pm.is_leader);
    setIsLeader(isL);

    setModalOpen(true);
  };

  const formatPhone = (val: string) => {
    return val.replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4,5})(\d{4})/, '$1-$2')
      .slice(0, 15);
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const toggleMinistry = (minId: string) => {
    setSelectedMinistries(prev => 
      prev.includes(minId) ? prev.filter(id => id !== minId) : [...prev, minId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { 
      addToast({ type: 'error', title: 'Nome é obrigatório' }); 
      return; 
    }
    
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        whatsapp: whatsapp.replace(/\D/g, '') || null,
        email: email.trim() || null,
        is_active: isActive
      };

      let personId = editItem?.id;

      if (editItem) {
        await supabase.from('people').update(payload).eq('id', editItem.id);
      } else {
        const { data } = await supabase.from('people').insert(payload).select().single();
        if (data) personId = data.id;
      }
      
      if (personId) {
        // Atualizar vínculos de funções
        await supabase.from('person_roles').delete().eq('person_id', personId);
        if (selectedRoles.length > 0) {
          const rolesPayload = selectedRoles.map(role_id => ({ person_id: personId, role_id }));
          await supabase.from('person_roles').insert(rolesPayload);
        }

        // Atualizar vínculos de ministérios
        await supabase.from('person_ministries').delete().eq('person_id', personId);
        if (selectedMinistries.length > 0) {
          const minPayload = selectedMinistries.map(ministry_id => ({ person_id: personId, ministry_id, is_leader: isLeader }));
          await supabase.from('person_ministries').insert(minPayload);
        }
      }
      
      addToast({ type: 'success', title: editItem ? 'Pessoa atualizada!' : 'Pessoa cadastrada!' });
      setModalOpen(false); 
      resetForm(); 
      fetchData();
    } catch { 
      addToast({ type: 'error', title: 'Erro ao salvar' }); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir esta pessoa permanentemente?')) return;

    try {
      await supabase.from('people').delete().eq('id', id);
      addToast({ type: 'success', title: 'Pessoa excluída com sucesso!' });
      fetchData();
    } catch {
      addToast({ type: 'error', title: 'Erro ao excluir pessoa' });
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    
    const lines = importText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    if (lines.length === 0) return;
    
    setImporting(true);
    try {
      const payload = lines.map(name => ({
        name,
        is_active: true
      }));
      
      const { error } = await supabase.from('people').insert(payload);
      
      if (error) throw error;
      
      addToast({ type: 'success', title: `${lines.length} pessoas importadas com sucesso!` });
      setImportModalOpen(false);
      setImportText('');
      fetchData();
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: 'Erro ao importar pessoas' });
    } finally {
      setImporting(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (activeTab === 'Inativos') return !item.is_active;
    if (!item.is_active) return false;
    
    if (activeTab === 'Todos') return true;
    
    const hasRole = (roleName: string) => item.person_roles?.some((pr: any) => pr.roles?.name?.toLowerCase()?.includes(roleName.toLowerCase()));
    const hasMinistry = (minName: string) => item.person_ministries?.some((pm: any) => pm.ministries?.name?.toLowerCase()?.includes(minName.toLowerCase()));
    
    if (activeTab === 'Pregadores') return hasRole('pregador');
    if (activeTab === 'Cantores') return hasRole('cantor') || hasRole('cantora');
    if (activeTab === 'Sonoplastia') return hasRole('sonoplasta') || hasRole('sonoplastia') || hasMinistry('sonoplastia');
    if (activeTab === 'Música') return hasMinistry('música') || hasMinistry('louvor') || item.person_roles?.some((pr: any) => pr.roles?.category === 'musical');
    if (activeTab === 'Líderes') return item.person_ministries?.some((pm: any) => pm.is_leader) || hasRole('diretor') || hasRole('líder');
    
    return true;
  });

  return (
    <ProtectedRoute requireAdmin>
      <Header title="Cadastro de Pessoas" onMenuToggle={() => {}}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setImportModalOpen(true)}>
            📥 Importar Lista
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setModalOpen(true); }}>
            ➕ Nova Pessoa
          </button>
        </div>
      </Header>
      
      <div className="app-content">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['Todos', 'Pregadores', 'Líderes', 'Cantores', 'Sonoplastia', 'Música', 'Inativos'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: activeTab === tab ? 'var(--primary)' : 'var(--border)',
                background: activeTab === tab ? 'var(--primary)' : 'transparent',
                color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 500 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={48} color="var(--text-tertiary)" /></div>
            <div className="empty-state-title">Nenhuma pessoa encontrada</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>Nenhum registro para a categoria selecionada.</p>
            {activeTab === 'Todos' && (
              <button className="btn btn-primary" onClick={() => { resetForm(); setModalOpen(true); }}>➕ Cadastrar Pessoa</button>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '60px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id} onClick={() => openEdit(item)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.whatsapp && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <Phone size={14} /> {formatPhone(item.whatsapp)}
                          </div>
                        )}
                        {item.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <Mail size={14} /> {item.email}
                          </div>
                        )}
                        {!item.whatsapp && !item.email && <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Sem contato</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.is_active ? (
                        <span className="badge" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>Ativo</span>
                      ) : (
                        <span className="badge badge-neutral">Inativo</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-icon" 
                        style={{ padding: '6px', color: 'var(--danger)', opacity: 0.8 }}
                        onClick={(e) => handleDelete(item.id, e)}
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}
          title={editItem ? 'Editar Pessoa' : 'Nova Pessoa'}
          footer={<>
            <button className="btn btn-secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </>}
        >
          <form id="person-form" onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João da Silva" required autoFocus />
            </div>
            
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input 
                type="tel" 
                className="form-input" 
                value={whatsapp} 
                onChange={e => setWhatsapp(formatPhone(e.target.value))} 
                placeholder="(00) 00000-0000" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@exemplo.com" />
            </div>

            <div className="form-checkbox-group">
              <input type="checkbox" id="person_active" className="form-checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <label htmlFor="person_active" className="form-checkbox-label">Cadastro Ativo</label>
            </div>
            
            {roles.length > 0 && (
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '10px', fontWeight: 600 }}>Atuações e Funções</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '180px', overflowY: 'auto', padding: '4px' }}>
                  {roles.map(r => (
                    <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        className="form-checkbox"
                        checked={selectedRoles.includes(r.id)}
                        onChange={() => toggleRole(r.id)}
                      />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {ministries.length > 0 && (
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '10px', fontWeight: 600 }}>Ministérios</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '4px' }}>
                  {ministries.map(m => (
                    <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        className="form-checkbox"
                        checked={selectedMinistries.includes(m.id)}
                        onChange={() => toggleMinistry(m.id)}
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {selectedMinistries.length > 0 && (
              <div className="form-checkbox-group" style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <input type="checkbox" id="person_leader" className="form-checkbox" checked={isLeader} onChange={e => setIsLeader(e.target.checked)} />
                <label htmlFor="person_leader" className="form-checkbox-label" style={{ fontWeight: 500, color: 'var(--primary)' }}>É Líder nestes ministérios?</label>
              </div>
            )}
          </form>
        </Modal>

        {/* Import Modal */}
        <Modal 
          isOpen={importModalOpen} 
          onClose={() => setImportModalOpen(false)}
          title="Importar Membros"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setImportModalOpen(false)} disabled={importing}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing || !importText.trim()}>
                {importing ? 'Importando...' : 'Importar Lista'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Cole os nomes (um por linha)</label>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-2)' }}>
              Copie do Excel ou Bloco de Notas e cole aqui. O sistema criará um cadastro para cada nome.
            </p>
            <textarea 
              className="form-input" 
              style={{ minHeight: '200px', resize: 'vertical' }}
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="João da Silva&#10;Maria Souza&#10;Pedro Santos"
              autoFocus
            />
          </div>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
