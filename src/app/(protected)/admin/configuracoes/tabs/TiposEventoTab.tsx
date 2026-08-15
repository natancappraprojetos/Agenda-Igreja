import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import EmojiPicker from '@/components/ui/EmojiPicker';
import { useToast } from '@/lib/hooks/useToast';
import type { EventType } from '@/lib/types';

export default function TiposEventoTab() {
  const supabase = createClient();
  const { addToast } = useToast();
  
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📅');
  const [color, setColor] = useState('#4f46e5');

  const fetchEventTypes = async () => {
    setLoading(true);
    const { data } = await supabase.from('event_types').select('*').order('name');
    if (data) setEventTypes(data as EventType[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchEventTypes();
  }, []);

  const handleEdit = (n: EventType) => {
    setEditingId(n.id);
    setName(n.name);
    setIcon(n.icon || '📅');
    setColor(n.color || '#4f46e5');
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setIcon('📅');
    setColor('#4f46e5');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !icon.trim()) return;

    const payload = {
      name: name.trim(),
      icon: icon.trim(),
      color: color
    };

    if (editingId) {
      const { error } = await supabase.from('event_types').update(payload).eq('id', editingId);
      if (error) {
        addToast({ type: 'error', title: 'Erro ao atualizar' });
      } else {
        addToast({ type: 'success', title: 'Tipo de Evento atualizado' });
        handleCancel();
        fetchEventTypes();
      }
    } else {
      const { error } = await supabase.from('event_types').insert(payload);
      if (error) {
        addToast({ type: 'error', title: 'Erro ao criar' });
      } else {
        addToast({ type: 'success', title: 'Tipo de Evento criado' });
        handleCancel();
        fetchEventTypes();
      }
    }
  };

  const handleToggleActive = async (n: EventType) => {
    const { error } = await supabase.from('event_types').update({ is_active: !n.is_active }).eq('id', n.id);
    if (!error) fetchEventTypes();
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>
          {editingId ? 'Editar Tipo de Evento' : 'Novo Tipo de Evento'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: '0.9rem' }}>
          Crie tipos de evento que poderão ser selecionados ao agendar. Ex: Culto de Ensino, Reunião de Jovens.
        </p>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
            <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
              <label className="form-label">Ícone</label>
              <EmojiPicker value={icon} onChange={setIcon} />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Nome (ex: Culto de Ensino)</label>
              <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Tipo de Evento" />
            </div>
            <div className="form-group" style={{ width: '100px', marginBottom: 0 }}>
              <label className="form-label">Cor</label>
              <input type="color" className="form-input" value={color} onChange={e => setColor(e.target.value)} style={{ padding: '0 4px', height: '44px', cursor: 'pointer' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancelar</button>
            )}
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Salvar' : 'Adicionar Tipo'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: '0' }}>
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div className="spinner" />
          </div>
        ) : eventTypes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Nenhum tipo de evento cadastrado</div>
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
              {eventTypes.map(n => (
                <tr key={n.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: '1.5rem', textAlign: 'center' }}>
                    {n.icon || '—'}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: n.color || 'var(--primary)' }}></span>
                      {n.name}
                    </div>
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
