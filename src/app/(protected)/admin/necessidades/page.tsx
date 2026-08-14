'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import { useToast } from '@/lib/hooks/useToast';
import type { EventNeedType } from '@/lib/types';

export default function AdminNecessidadesPage() {
  const supabase = createClient();
  const { addToast } = useToast();
  
  const [needTypes, setNeedTypes] = useState<EventNeedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🔊');
  const [description, setDescription] = useState('');

  const fetchNeedTypes = async () => {
    setLoading(true);
    const { data } = await supabase.from('event_needs_types').select('*').order('name');
    if (data) setNeedTypes(data as EventNeedType[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchNeedTypes();
  }, []);

  const handleEdit = (n: EventNeedType) => {
    setEditingId(n.id);
    setName(n.name);
    setIcon(n.icon || '');
    setDescription(n.description || '');
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setIcon('🔊');
    setDescription('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !icon.trim()) return;

    const payload = {
      name: name.trim(),
      icon: icon.trim(),
      description: description.trim() || null
    };

    if (editingId) {
      const { error } = await supabase.from('event_needs_types').update(payload).eq('id', editingId);
      if (error) {
        addToast({ type: 'error', title: 'Erro ao atualizar' });
      } else {
        addToast({ type: 'success', title: 'Necessidade atualizada' });
        handleCancel();
        fetchNeedTypes();
      }
    } else {
      const { error } = await supabase.from('event_needs_types').insert(payload);
      if (error) {
        addToast({ type: 'error', title: 'Erro ao criar' });
      } else {
        addToast({ type: 'success', title: 'Necessidade criada' });
        handleCancel();
        fetchNeedTypes();
      }
    }
  };

  const handleToggleActive = async (n: EventNeedType) => {
    const { error } = await supabase.from('event_needs_types').update({ is_active: !n.is_active }).eq('id', n.id);
    if (!error) fetchNeedTypes();
  };

  return (
    <>
      <Header title="Configurações de Necessidades (Perguntas de Agendamento)" onMenuToggle={() => {}} />
      <div className="app-content">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          
          <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)' }}>
              {editingId ? 'Editar Necessidade' : 'Nova Necessidade'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: '0.9rem' }}>
              Crie perguntas ou necessidades que aparecerão como opções para marcar ao agendar um evento (ex: Precisa de comida? Sonoplastia?).
            </p>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
                  <label className="form-label">Ícone</label>
                  <input type="text" className="form-input" value={icon} onChange={e => setIcon(e.target.value)} placeholder="🔊" maxLength={5} style={{ textAlign: 'center', fontSize: '1.5rem' }} />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Nome (ex: Sonoplastia / Mídia)</label>
                  <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da necessidade" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Descrição (Opcional)</label>
                <input type="text" className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Equipe responsável pelo som e projeção" />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                {editingId && (
                  <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancelar</button>
                )}
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Salvar' : 'Adicionar Necessidade'}
                </button>
              </div>
            </form>
          </div>

          <div className="card" style={{ padding: '0' }}>
            {loading ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <div className="spinner" />
              </div>
            ) : needTypes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">Nenhuma necessidade cadastrada</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', width: '50px' }}>Ícone</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Nome e Descrição</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', width: '100px' }}>Status</th>
                    <th style={{ padding: 'var(--space-3) var(--space-4)', width: '100px', textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {needTypes.map(n => (
                    <tr key={n.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: '1.5rem', textAlign: 'center' }}>
                        {n.icon || '—'}
                      </td>
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
      </div>
    </>
  );
}
