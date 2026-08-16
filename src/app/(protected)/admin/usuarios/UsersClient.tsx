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

export default function UsersClient({ initialUsers, appRoles }: UsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [appRoleId, setAppRoleId] = useState('');
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();

  const handleCreate = async () => {
    if (!email || !password || !name) {
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
        body: JSON.stringify({ email, password, name, appRoleId })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

      if (!isEditMode) {
        addToast({ type: 'success', title: 'Acesso criado com sucesso!' });
        
        // Add the new user to state to reflect immediately
        const newRole = appRoles.find(r => r.id === appRoleId);
        setUsers([...users, {
          id: data.user.id,
          email: email,
          name: name,
          roles: newRole ? [newRole] : []
        }]);
      } else {
        addToast({ type: 'success', title: 'Acesso atualizado com sucesso!' });
        
        // Update user in state
        const updatedRole = appRoles.find(r => r.id === appRoleId);
        setUsers(users.map(u => u.id === editingUserId ? {
          ...u,
          email: email,
          name: name,
          roles: updatedRole ? [updatedRole] : []
        } : u));
      }

      setIsModalOpen(false);

      // Reset
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
    setAppRoleId(u.roles[0]?.id || '');
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
    setAppRoleId('');
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
              <div key={u.id} style={{ backgroundColor: 'var(--surface)', padding: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{u.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  {u.roles.map((r, i) => (
                    <span key={i} className="badge badge-info">{r.name}</span>
                  ))}
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
          <label className="form-label">{isEditMode ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha *'}</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder={isEditMode ? "Deixe em branco para manter a mesma" : "Senha (mínimo 6 caracteres)"} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
        </div>

        <div className="form-group">
          <label className="form-label">Nível de Acesso (Perfil)</label>
          <select className="form-input" value={appRoleId} onChange={e => setAppRoleId(e.target.value)}>
            <option value="">(Sem permissão especial)</option>
            {appRoles.map(r => (
              <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
            ))}
          </select>
        </div>
      </Modal>
    </>
  );
}
