import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import EmojiPicker from '@/components/ui/EmojiPicker';
import { useToast } from '@/lib/hooks/useToast';

interface LiturgyItemType {
  id: string;
  name: string;
  default_duration_minutes: number;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
}

export default function TiposLiturgiaTab() {
  const supabase = createClient();
  const { addToast } = useToast();
  
  const [types, setTypes] = useState<LiturgyItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎤');
  const [duration, setDuration] = useState('5');
  const [sortOrder, setSortOrder] = useState('0');

  const fetchTypes = async () => {
    setLoading(true);
    const { data } = await supabase.from('liturgy_item_types').select('*').order('sort_order');
    if (data) setTypes(data as LiturgyItemType[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleEdit = (n: LiturgyItemType) => {
    setEditingId(n.id);
    setName(n.name);
    setIcon(n.icon || '🎤');
    setDuration(n.default_duration_minutes.toString());
    setSortOrder(n.sort_order.toString());
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setIcon('🎤');
    setDuration('5');
    setSortOrder('0');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !icon.trim()) return;

    const payload = {
      name: name.trim(),
      icon: icon.trim(),
      default_duration_minutes: parseInt(duration) || 5,
      sort_order: parseInt(sortOrder) || 0
    };

    if (editingId) {
      const { error } = await supabase.from('liturgy_item_types').update(payload).eq('id', editingId);
      if (error) {
        addToast({ type: 'error', title: 'Erro ao atualizar' });
      } else {
        addToast({ type: 'success', title: 'Tipo atualizado' });
        handleCancel();
        fetchTypes();
      }
    } else {
      const { error } = await supabase.from('liturgy_item_types').insert(payload);
      if (error) {
        addToast({ type: 'error', title: 'Erro ao criar' });
      } else {
        addToast({ type: 'success', title: 'Tipo criado' });
        handleCancel();
        fetchTypes();
      }
    }
  };

  const handleToggleActive = async (n: LiturgyItemType) => {
    const { error } = await supabase.from('liturgy_item_types').update({ is_active: !n.is_active }).eq('id', n.id);
    if (!error) fetchTypes();
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <h3 style={{ marginBottom: 'var(--space-4)' }}>
          {editingId ? 'Editar Tipo de Liturgia' : 'Novo Tipo de Liturgia'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: '0.9rem' }}>
          Crie tipos de itens que poderão ser usados para montar a liturgia (ex: Louvor, Palavra, Avisos, Ofertório).
        </p>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
            <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
              <label className="form-label">Ícone</label>
              <EmojiPicker value={icon} onChange={setIcon} />
            </div>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label">Nome (ex: Louvor)</label>
              <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Tipo de Item" />
            </div>
            <div className="form-group" style={{ width: '120px', marginBottom: 0 }}>
              <label className="form-label">Duração (min)</label>
              <input type="number" className="form-input" value={duration} onChange={e => setDuration(e.target.value)} min="1" />
            </div>
            <div className="form-group" style={{ width: '100px', marginBottom: 0 }}>
              <label className="form-label">Ordem</label>
              <input type="number" className="form-input" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
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
        ) : types.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Nenhum tipo de liturgia cadastrado</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', textAlign: 'left' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)', width: '50px' }}>Ícone</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>Nome</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', width: '120px' }}>Duração Padrão</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', width: '80px', textAlign: 'center' }}>Ordem</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', width: '100px' }}>Status</th>
                <th style={{ padding: 'var(--space-3) var(--space-4)', width: '100px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {types.map(n => (
                <tr key={n.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontSize: '1.5rem', textAlign: 'center' }}>
                    {n.icon || '—'}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 600 }}>
                    {n.name}
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    {n.default_duration_minutes} min
                  </td>
                  <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                    {n.sort_order}
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
