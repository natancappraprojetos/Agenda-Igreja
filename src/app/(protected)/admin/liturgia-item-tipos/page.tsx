'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import type { LiturgyItemType } from '@/lib/types';

export default function LiturgiaItemTiposPage() {
  const [items, setItems] = useState<LiturgyItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<LiturgyItemType | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📋');
  const [defaultDuration, setDefaultDuration] = useState('5');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('liturgy_item_types').select('*').order('sort_order').order('name');
    setItems((data || []) as LiturgyItemType[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => { 
    setName(''); setIcon('📋'); setDefaultDuration('5'); setIsActive(true); setSortOrder('0'); setEditItem(null); 
  };

  const openEdit = (item: LiturgyItemType) => {
    setEditItem(item); setName(item.name); setIcon(item.icon); 
    setDefaultDuration(item.default_duration_minutes.toString()); 
    setIsActive(item.is_active); setSortOrder(item.sort_order.toString()); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { addToast({ type: 'error', title: 'Nome obrigatório' }); return; }
    setSaving(true);
    try {
      const payload = { 
        name: name.trim(), icon: icon.trim() || '📋',
        default_duration_minutes: parseInt(defaultDuration) || 5,
        is_active: isActive, sort_order: parseInt(sortOrder) || 0 
      };
      if (editItem) {
        await supabase.from('liturgy_item_types').update(payload).eq('id', editItem.id);
      } else {
        await supabase.from('liturgy_item_types').insert(payload);
      }
      addToast({ type: 'success', title: editItem ? 'Tipo atualizado!' : 'Tipo criado!' });
      setModalOpen(false); resetForm(); fetchData();
    } catch { 
      addToast({ type: 'error', title: 'Erro ao salvar' }); 
    } finally { setSaving(false); }
  };

  return (
    <>
      <Header title="Itens de Liturgia" onMenuToggle={() => {}}>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setModalOpen(true); }}>
          ➕ Novo Item
        </button>
      </Header>
      <div className="app-content">
        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⏱️</div>
            <div className="empty-state-title">Nenhum item cadastrado</div>
            <button className="btn btn-primary" onClick={() => { resetForm(); setModalOpen(true); }}>➕ Criar Item</button>
          </div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ícone</th>
                  <th>Nome</th>
                  <th>Duração Padrão</th>
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
                    <td>{item.default_duration_minutes} min</td>
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
          title={editItem ? 'Editar Item' : 'Novo Item'}
          footer={<>
            <button className="btn btn-secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </>}
        >
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Louvor, Mensagem, Ofertório..." autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Ícone (Emoji)</label>
              <input type="text" className="form-input" value={icon} onChange={e => setIcon(e.target.value)} placeholder="Ex: 🎵" />
            </div>
            <div className="form-group">
              <label className="form-label">Duração Padrão (min)</label>
              <input type="number" className="form-input" value={defaultDuration} onChange={e => setDefaultDuration(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Ordem de Exibição</label>
              <input type="number" className="form-input" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
            </div>
            <div className="form-checkbox-group" style={{ marginTop: '28px' }}>
              <input type="checkbox" id="lit_active" className="form-checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <label htmlFor="lit_active" className="form-checkbox-label">Ativo</label>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
