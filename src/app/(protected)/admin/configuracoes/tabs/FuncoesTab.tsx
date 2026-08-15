import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import type { Role } from '@/lib/types';

export default function FuncoesTab() {
  const supabase = createClient();
  const { addToast } = useToast();
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchRoles = async () => {
    setLoading(true);
    const { data } = await supabase.from('roles').select('*').order('name');
    if (data) setRoles(data as Role[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleEdit = (n: Role) => {
    setEditingId(n.id);
    setName(n.name);
    setDescription(n.description || '');
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setDescription('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || null
    };

    if (editingId) {
      const { error } = await supabase.from('roles').update(payload).eq('id', editingId);
      if (error) {
        addToast({ type: 'error', title: 'Erro ao atualizar' });
      } else {
        addToast({ type: 'success', title: 'Função atualizada' });
        handleCancel();
        fetchRoles();
      }
    } else {
      const { error } = await supabase.from('roles').insert(payload);
      if (error) {
        addToast({ type: 'error', title: 'Erro ao criar' });
      } else {
        addToast({ type: 'success', title: 'Função criada' });
        handleCancel();
        fetchRoles();
      }
    }
  };

  const handleToggleActive = async (n: Role) => {
    const { error } = await supabase.from('roles').update({ is_active: !n.is_active }).eq('id', n.id);
    if (!error) fetchRoles();
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>
          {editingId ? 'Editar Função' : 'Nova Função'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: '0.9rem' }}>
          Crie funções e cargos para as escalas (ex: Ancião, Diácono, Sonoplasta, Mídia).
        </p>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nome da Função (ex: Sonoplasta)</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da Função" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Descrição (Opcional)</label>
            <input type="text" className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Responsável pela mesa de som" />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancelar</button>
            )}
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Salvar' : 'Adicionar Função'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: '0' }}>
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div className="spinner" />
          </div>
        ) : roles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Nenhuma função cadastrada</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', textAlign: 'left' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Nome e Descrição</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', width: '100px' }}>Status</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', width: '100px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(n => (
                <tr key={n.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div style={{ fontWeight: 600 }}>{n.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{n.description}</div>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <span className={`badge ${n.is_active ? 'badge-success' : 'badge-danger'}`}>
                      {n.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(n)} style={{ marginRight: '4px' }}>✏️</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(n)}>
                      {n.is_active ? '⏸️' : '▶️'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
