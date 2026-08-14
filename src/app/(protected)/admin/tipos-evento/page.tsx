'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import type { EventType } from '@/lib/types';

export default function TiposEventoPage() {
  const [items, setItems] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<EventType | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📅');
  const [color, setColor] = useState('#4F46E5');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('event_types').select('*').order('sort_order').order('name');
    setItems((data || []) as EventType[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => { 
    setName(''); setIcon('📅'); setColor('#4F46E5'); setIsActive(true); setSortOrder('0'); setEditItem(null); 
  };

  const openEdit = (item: EventType) => {
    setEditItem(item); setName(item.name); setIcon(item.icon); setColor(item.color); 
    setIsActive(item.is_active); setSortOrder(item.sort_order.toString()); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { addToast({ type: 'error', title: 'Nome obrigatório' }); return; }
    setSaving(true);
    try {
      const payload = { 
        name: name.trim(), icon: icon.trim() || '📅', color,
        is_active: isActive, sort_order: parseInt(sortOrder) || 0 
      };
      if (editItem) {
        await supabase.from('event_types').update(payload).eq('id', editItem.id);
      } else {
        await supabase.from('event_types').insert(payload);
      }
      addToast({ type: 'success', title: editItem ? 'Tipo atualizado!' : 'Tipo criado!' });
      setModalOpen(false); resetForm(); fetchData();
    } catch { 
      addToast({ type: 'error', title: 'Erro ao salvar' }); 
    } finally { setSaving(false); }
  };

  return (
    <>
      <Header title="Tipos de Evento" onMenuToggle={() => {}}>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setModalOpen(true); }}>
          ➕ Novo Tipo
        </button>
      </Header>
      <div className="app-content">
        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <div className="empty-state-title">Nenhum tipo cadastrado</div>
            <button className="btn btn-primary" onClick={() => { resetForm(); setModalOpen(true); }}>➕ Criar Tipo</button>
          </div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ícone</th>
                  <th>Nome</th>
                  <th>Cor</th>
                  <th>Status</th>
                  <th>Ordem</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontSize: '1.5rem' }}>{item.icon}</td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: item.color }} />
                        {item.color}
                      </div>
                    </td>
                    <td>{item.is_active ? <span className="badge badge-success">Ativo</span> : <span className="badge badge-neutral">Inativo</span>}</td>
                    <td>{item.sort_order}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>✏️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}
          title={editItem ? 'Editar Tipo de Evento' : 'Novo Tipo de Evento'}
          footer={<>
            <button className="btn btn-secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </>}
        >
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Culto, Reunião..." autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Ícone (Emoji)</label>
              <input type="text" className="form-input" value={icon} onChange={e => setIcon(e.target.value)} placeholder="Ex: ⛪" />
            </div>
            <div className="form-group">
              <label className="form-label">Cor</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 48, height: 48, border: 'none', borderRadius: 'var(--radius-md)' }} />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Ordem de Exibição</label>
              <input type="number" className="form-input" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
            </div>
            <div className="form-checkbox-group" style={{ marginTop: '28px' }}>
              <input type="checkbox" id="te_active" className="form-checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <label htmlFor="te_active" className="form-checkbox-label">Ativo</label>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
