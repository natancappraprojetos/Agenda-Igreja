'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';
import type { Ministry } from '@/lib/types';

export default function MinisteriosPage() {
  const [items, setItems] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Ministry | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#4F46E5');
  const [isActive, setIsActive] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('ministries')
      .select('*').order('name');
    setItems((data || []) as Ministry[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => { setName(''); setDescription(''); setColor('#4F46E5'); setIsActive(true); setEditItem(null); };

  const openEdit = (item: Ministry) => {
    setEditItem(item); setName(item.name); setDescription(item.description || '');
    setColor(item.color || '#4F46E5'); setIsActive(item.is_active); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { addToast({ type: 'error', title: 'Nome obrigatório' }); return; }
    setSaving(true);
    try {
      if (editItem) {
        await supabase.from('ministries').update({ name: name.trim(), description: description || null, color, is_active: isActive }).eq('id', editItem.id);
      } else {
        await supabase.from('ministries').insert({ name: name.trim(), description: description || null, color, is_active: isActive });
      }
      addToast({ type: 'success', title: editItem ? 'Ministério atualizado!' : 'Ministério criado!' });
      setModalOpen(false); resetForm(); fetchData();
    } catch { addToast({ type: 'error', title: 'Erro ao salvar' }); }
    finally { setSaving(false); }
  };

  return (
    <>
      <Header title="Ministérios" onMenuToggle={() => {}}>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setModalOpen(true); }}>
          ➕ Novo Ministério
        </button>
      </Header>
      <div className="app-content">
        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏛️</div>
            <div className="empty-state-title">Nenhum ministério cadastrado</div>
            <button className="btn btn-primary" onClick={() => { resetForm(); setModalOpen(true); }}>➕ Criar Ministério</button>
          </div>
        ) : (
          <div className="grid grid-3">
            {items.map(item => (
              <div key={item.id} className="card card-hover" onClick={() => router.push(`/ministerios/${item.id}`)} style={{ cursor: 'pointer', borderLeft: `4px solid ${item.color}` }}>
                <div className="card-header">
                  <h3 className="card-title">{item.name}</h3>
                  {!item.is_active && <span className="badge badge-neutral">Inativo</span>}
                </div>
                {item.description && <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{item.description}</p>}
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}
          title={editItem ? 'Editar Ministério' : 'Novo Ministério'}
          footer={<>
            <button className="btn btn-secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </>}
        >
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do ministério" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do ministério" />
          </div>
          <div className="form-group">
            <label className="form-label">Cor</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 48, height: 48, border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)' }} />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{color}</span>
            </div>
          </div>
          <div className="form-checkbox-group">
            <input type="checkbox" id="min_active" className="form-checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <label htmlFor="min_active" className="form-checkbox-label">Ativo</label>
          </div>
        </Modal>
      </div>
    </>
  );
}
