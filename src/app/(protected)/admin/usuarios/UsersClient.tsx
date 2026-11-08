'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/lib/hooks/useToast';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
}

interface UsersClientProps {
  initialUsers: User[];
  appRoles: Role[];
}

export function formatRoleLabel(roleName: string): string {
  switch (roleName) {
    case 'admin':
      return 'Administrador';
    case 'anciao':
      return 'Ancião / Liderança';
    case 'diacono':
      return 'Diaconato';
    case 'musica':
      return 'Ministério da Música';
    case 'sonoplastia':
      return 'Sonoplastia';
    case 'escola_sabatina':
      return 'Escola Sabatina';
    default:
      return roleName;
  }
}

export default function UsersClient({ initialUsers, appRoles }: UsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();

  const handleCreate = async () => {
    if (!email || !name || (!isEditMode && !password)) {
      addToast({ type: 'error', title: 'Preencha os campos obrigatórios' });
      return;
    }

    setLoading(true);
    try {
      const endpoint = isEditMode ? `/api/admin/users/${editingUserId}` : '/api/admin/users';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password: password || undefined, 
          name, 
          appRoleIds: selectedRoleIds 
        })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

      const selectedRoles = appRoles.filter(r => selectedRoleIds.includes(r.id));

      if (!isEditMode) {
        addToast({ type: 'success', title: 'Acesso criado com sucesso!' });
        
        // Add new user to state
        setUsers([...users, {
          id: data.user.id,
          email: email,
          name: name,
          roles: selectedRoles
        }]);
      } else {
        addToast({ type: 'success', title: 'Acesso atualizado com sucesso!' });
        
        // Update user in state
        setUsers(users.map(u => u.id === editingUserId ? {
          ...u,
          email: email,
          name: name,
          roles: selectedRoles
        } : u));
      }

      setIsModalOpen(false);
      resetForm();
      
    } catch (err: any) {
      addToast({ type: 'error', title: isEditMode ? 'Falha ao atualizar acesso' : 'Falha ao criar acesso', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (u: User) => {
    setIsEditMode(true);
    setEditingUserId(u.id);
    setName(u.name);
    setEmail(u.email);
    setPassword(''); // leave blank
    setSelectedRoleIds(u.roles ? u.roles.map(r => r.id) : []);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir permanentemente este acesso?')) return;
    
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
      
      addToast({ type: 'success', title: 'Acesso excluído com sucesso!' });
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      addToast({ type: 'error', title: 'Erro ao excluir', message: err.message });
    }
  };

  const openNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setIsEditMode(false);
    setEditingUserId(null);
    setEmail('');
    setPassword('');
    setName('');
    setSelectedRoleIds([]);
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <button className="btn btn-primary" onClick={openNewModal}>
          + Novo Acesso
        </button>
      </div>

      <div className="card">
        {users.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-secondary)' }}>Nenhum usuário cadastrado.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--border)' }}>
            {users.map(u => (
              <div key={u.id} style={{ backgroundColor: 'var(--surface)', padding: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {u.roles && u.roles.length > 0 ? (
                      u.roles.map((r, i) => (
                        <span key={i} className="badge badge-info" title={r.description}>
                          {formatRoleLabel(r.name)}
                        </span>
                      ))
                    ) : (
                      <span className="badge badge-ghost">Sem ministério</span>
                    )}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEditClick(u)}>✏️ Editar</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteClick(u.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditMode ? "Editar Acesso" : "Criar Novo Acesso"}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Acesso'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Nome de Exibição *</label>
          <input 
            className="form-input" 
            placeholder="Ex: Diretor de Som" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            autoFocus 
          />
        </div>

        <div className="form-group">
          <label className="form-label">E-mail (Login) *</label>
          <input 
            type="email" 
            className="form-input" 
            placeholder="Ex: som@santoafonso.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pode ser um e-mail fictício, servirá apenas para login.</span>
        </div>

        <div className="form-group">
          <label className="form-label">{isEditMode ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder={isEditMode ? "Deixe em branco para manter a mesma" : "Senha (mínimo 6 caracteres)"} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 600, marginBottom: '8px' }}>
            Ministérios / Perfis de Acesso (Selecione um ou mais)
          </label>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '260px',
            overflowY: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            backgroundColor: 'var(--background-secondary)'
          }}>
            {appRoles.map(r => {
              const isChecked = selectedRoleIds.includes(r.id);
              return (
                <label
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    cursor: 'pointer',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isChecked ? 'rgba(59, 130, 246, 0.08)' : 'var(--surface)',
                    border: isChecked ? '1px solid var(--primary)' : '1px solid var(--border)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    style={{ marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px' }}
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoleIds([...selectedRoleIds, r.id]);
                      } else {
                        setSelectedRoleIds(selectedRoleIds.filter(id => id !== r.id));
                      }
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                        {formatRoleLabel(r.name)}
                      </span>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{r.name}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {r.description}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px', display: 'block' }}>
            Marque todos os departamentos que esse usuário terá permissão para gerenciar na Central de Escalas.
          </span>
        </div>
      </Modal>
    </>
  );
}
