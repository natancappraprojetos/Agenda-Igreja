'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import type { Person, Role, Ministry } from '@/lib/types';

export default function PessoasPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { addToast } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [peopleRes, rolesRes, ministriesRes] = await Promise.all([
      supabase.from('people').select(`
        *,
        person_roles(*, role:roles(*)),
        person_ministries(*, ministry:ministries(*))
      `).order('name'),
      supabase.from('roles').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('ministries').select('*').eq('is_active', true).order('name'),
    ]);
    setPeople((peopleRes.data || []) as unknown as Person[]);
    setRoles((rolesRes.data || []) as Role[]);
    setMinistries((ministriesRes.data || []) as Ministry[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setName(''); setPhone(''); setWhatsapp(''); setEmail('');
    setIsActive(true); setSelectedRoles([]); setSelectedMinistries([]);
    setEditPerson(null);
  };

  const openNew = () => { resetForm(); setModalOpen(true); };

  const openEdit = (person: Person) => {
    setEditPerson(person);
    setName(person.name);
    setPhone(person.phone || '');
    setWhatsapp(person.whatsapp || '');
    setEmail(person.email || '');
    setIsActive(person.is_active);
    setSelectedRoles(person.person_roles?.map(pr => pr.role_id) || []);
    setSelectedMinistries(person.person_ministries?.map(pm => pm.ministry_id) || []);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({ type: 'error', title: 'Nome obrigatório', message: 'Informe o nome da pessoa.' });
      return;
    }
    setSaving(true);
    try {
      let personId: string;

      if (editPerson) {
        const { error } = await supabase.from('people').update({
          name: name.trim(), phone: phone || null, whatsapp: whatsapp || null,
          email: email || null, is_active: isActive,
        }).eq('id', editPerson.id);
        if (error) throw error;
        personId = editPerson.id;

        // Update roles: delete all then re-insert
        await supabase.from('person_roles').delete().eq('person_id', personId);
        await supabase.from('person_ministries').delete().eq('person_id', personId);
      } else {
        const { data, error } = await supabase.from('people').insert({
          name: name.trim(), phone: phone || null, whatsapp: whatsapp || null,
          email: email || null, is_active: isActive,
        }).select().single();
        if (error) throw error;
        personId = data.id;
      }

      // Insert roles
      if (selectedRoles.length > 0) {
        await supabase.from('person_roles').insert(
          selectedRoles.map(roleId => ({ person_id: personId, role_id: roleId }))
        );
      }

      // Insert ministries
      if (selectedMinistries.length > 0) {
        await supabase.from('person_ministries').insert(
          selectedMinistries.map(minId => ({ person_id: personId, ministry_id: minId }))
        );
      }

      addToast({ type: 'success', title: editPerson ? 'Pessoa atualizada!' : 'Pessoa cadastrada!', message: name });
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao salvar', message: 'Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const filtered = people.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  const toggleMinistry = (minId: string) => {
    setSelectedMinistries(prev =>
      prev.includes(minId) ? prev.filter(m => m !== minId) : [...prev, minId]
    );
  };

  return (
    <>
      <Header title="Pessoas" onMenuToggle={() => {}}>
        <button className="btn btn-primary btn-sm" onClick={openNew}>
          ➕ Nova Pessoa
        </button>
      </Header>
      <div className="app-content">
        {/* Search */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Buscar pessoa por nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-page">
            <div className="spinner spinner-lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">
              {search ? 'Nenhuma pessoa encontrada' : 'Nenhuma pessoa cadastrada'}
            </div>
            <div className="empty-state-description">
              {search ? 'Tente buscar por outro nome.' : 'Cadastre as pessoas da igreja para começar.'}
            </div>
            {!search && (
              <button className="btn btn-primary" onClick={openNew}>
                ➕ Cadastrar Pessoa
              </button>
            )}
          </div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Funções</th>
                  <th>Ministérios</th>
                  <th>Contato</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(person => (
                  <tr key={person.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{person.name}</div>
                      {person.email && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{person.email}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                        {person.person_roles?.map(pr => (
                          <span key={pr.id} className="badge badge-primary">{pr.role?.name}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                        {person.person_ministries?.map(pm => (
                          <span key={pm.id} className="badge badge-neutral">{pm.ministry?.name}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {person.phone && <div style={{ fontSize: 'var(--font-size-sm)' }}>📞 {person.phone}</div>}
                      {person.whatsapp && <div style={{ fontSize: 'var(--font-size-sm)' }}>💬 {person.whatsapp}</div>}
                    </td>
                    <td>
                      {person.is_active ? (
                        <span className="badge badge-success">Ativo</span>
                      ) : (
                        <span className="badge badge-neutral">Inativo</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(person)}>
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); resetForm(); }}
          title={editPerson ? 'Editar Pessoa' : 'Nova Pessoa'}
          size="lg"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => { setModalOpen(false); resetForm(); }}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : editPerson ? 'Salvar Alterações' : 'Cadastrar'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome completo"
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input type="tel" className="form-input" value={phone}
                onChange={e => setPhone(e.target.value)} placeholder="(00) 0000-0000" />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input type="tel" className="form-input" value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input type="email" className="form-input" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </div>

          {/* Roles */}
          <div className="form-group">
            <label className="form-label">Funções</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {roles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  className={`btn btn-sm ${selectedRoles.includes(role.id) ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => toggleRole(role.id)}
                >
                  {selectedRoles.includes(role.id) ? '✅ ' : ''}{role.name}
                </button>
              ))}
            </div>
          </div>

          {/* Ministries */}
          <div className="form-group">
            <label className="form-label">Ministérios</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {ministries.map(min => (
                <button
                  key={min.id}
                  type="button"
                  className={`btn btn-sm ${selectedMinistries.includes(min.id) ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => toggleMinistry(min.id)}
                  style={selectedMinistries.includes(min.id) ? { background: min.color, borderColor: min.color } : {}}
                >
                  {selectedMinistries.includes(min.id) ? '✅ ' : ''}{min.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-checkbox-group">
            <input type="checkbox" id="person_active" className="form-checkbox"
              checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <label htmlFor="person_active" className="form-checkbox-label">Pessoa ativa</label>
          </div>
        </Modal>
      </div>
    </>
  );
}
