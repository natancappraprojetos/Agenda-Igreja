'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import type { Location } from '@/lib/types';

export default function LocaisPage() {
  const [items, setItems] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Location | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('locations').select('*').order('name');
    setItems((data || []) as Location[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => { setName(''); setDescription(''); setCapacity(''); setIsActive(true); setEditItem(null); };

  const openEdit = (item: Location) => {
    setEditItem(item); setName(item.name); setDescription(item.description || '');
    setCapacity(item.capacity?.toString() || ''); setIsActive(item.is_active); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { addToast({ type: 'error', title: 'Nome obrigatório' }); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), description: description || null, capacity: capacity ? parseInt(capacity) : null, is_active: isActive };
      if (editItem) {
        await supabase.from('locations').update(payload).eq('id', editItem.id);
      } else {
        await supabase.from('locations').insert(payload);
      }
      addToast({ type: 'success', title: editItem ? 'Local atualizado!' : 'Local criado!' });
      setModalOpen(false); resetForm(); fetchData();
    } catch { addToast({ type: 'error', title: 'Erro ao salvar' }); }
    finally { setSaving(false); }
  };

  return (
    <>
      <Header title="Locais" onMenuToggle={() => {}}>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setModalOpen(true); }}>
          ➕ Novo Local
        </button>
      </Header>
      <div className="app-content">
        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📍</div>
            <div className="empty-state-title">Nenhum local cadastrado</div>
            <button className="btn btn-primary" onClick={() => { resetForm(); setModalOpen(true); }}>➕ Criar Local</button>
          </div>
        ) : (
          <div className="grid grid-3">
            {items.map(item => (
              <div key={item.id} className="card card-hover" onClick={() => openEdit(item)} style={{ cursor: 'pointer' }}>
                <div className="card-header">
                  <h3 className="card-title">📍 {item.name}</h3>
                  {!item.is_active && <span className="badge badge-neutral">Inativo</span>}
                </div>
                {item.description && <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>{item.description}</p>}
                {item.capacity && <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-2)' }}>Capacidade: {item.capacity} pessoas</p>}
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}
          title={editItem ? 'Editar Local' : 'Novo Local'}
          footer={<>
            <button className="btn btn-secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </>}
        >
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do local" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do local" />
          </div>
          <div className="form-group">
            <label className="form-label">Capacidade</label>
            <input type="number" className="form-input" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Número de pessoas" />
          </div>
          <div className="form-checkbox-group">
            <input type="checkbox" id="loc_active" className="form-checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            <label htmlFor="loc_active" className="form-checkbox-label">Ativo</label>
          </div>
        </Modal>
      </div>
    </>
  );
}
