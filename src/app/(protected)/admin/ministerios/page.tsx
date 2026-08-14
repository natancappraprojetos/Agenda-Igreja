'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import { useToast } from '@/lib/hooks/useToast';
import type { Ministry } from '@/lib/types';

export default function AdminMinisteriosPage() {
  const supabase = createClient();
  const { addToast } = useToast();
  
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏛️');

  const fetchMinistries = async () => {
    setLoading(true);
    const { data } = await supabase.from('ministries').select('*').order('name');
    if (data) setMinistries(data as Ministry[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMinistries();
  }, []);

  const handleEdit = (m: Ministry) => {
    setEditingId(m.id);
    setName(m.name);
    setIcon(m.icon || '🏛️');
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setIcon('🏛️');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !icon.trim()) return;

    if (editingId) {
      // Update
      const { error } = await supabase.from('ministries').update({ name: name.trim(), icon: icon.trim() }).eq('id', editingId);
      if (error) {
        addToast({ type: 'error', title: 'Erro ao atualizar' });
      } else {
        addToast({ type: 'success', title: 'Ministério atualizado' });
        handleCancel();
        fetchMinistries();
      }
    } else {
      // Insert
      const { error } = await supabase.from('ministries').insert({ name: name.trim(), icon: icon.trim() });
      if (error) {
        addToast({ type: 'error', title: 'Erro ao criar' });
      } else {
        addToast({ type: 'success', title: 'Ministério criado' });
        handleCancel();
        fetchMinistries();
      }
    }
  };

  const handleToggleActive = async (m: Ministry) => {
    const { error } = await supabase.from('ministries').update({ is_active: !m.is_active }).eq('id', m.id);
    if (!error) fetchMinistries();
  };

  return (
    <>
      <Header title="Configurações de Ministérios" onMenuToggle={() => {}} />
      <div className="app-content">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          
          <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)' }}>
              {editingId ? 'Editar Ministério' : 'Novo Ministério'}
            </h3>
            <form onSubmit={handleSave} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
                <label className="form-label">Ícone</label>
                <input type="text" className="form-input" value={icon} onChange={e => setIcon(e.target.value)} placeholder="🏛️" maxLength={5} style={{ textAlign: 'center', fontSize: '1.5rem' }} />
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Nome do Ministério</label>
                <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Ministério Jovem" />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {editingId && (
                  <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancelar</button>
                )}
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>

          <div className="card" style={{ padding: '0' }}>
            {loading ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <div className="spinner" />
              </div>
            ) : ministries.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">Nenhum ministério cadastrado</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', width: '50px' }}>Ícone</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Nome</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', width: '100px' }}>Status</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', width: '100px', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ministries.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: '1.5rem', textAlign: 'center' }}>
                        {m.icon || '🏛️'}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 500 }}>
                        {m.name}
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                        <span className={`badge ${m.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {m.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(m)} style={{ marginRight: '4px' }}>✏️</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActive(m)}>
                          {m.is_active ? '⏸️' : '▶️'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
