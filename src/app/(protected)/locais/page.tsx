'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import ProtectedRoute from '@/components/ui/ProtectedRoute';
import { MapPin } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  description: string;
  capacity: number;
  is_active: boolean;
}

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

  const resetForm = () => { 
    setName(''); 
    setDescription(''); 
    setCapacity(''); 
    setIsActive(true); 
    setEditItem(null); 
  };

  const openEdit = (item: Location) => {
    setEditItem(item); 
    setName(item.name); 
    setDescription(item.description || '');
    setCapacity(item.capacity?.toString() || ''); 
    setIsActive(item.is_active); 
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { 
      addToast({ type: 'error', title: 'Nome é obrigatório' }); 
      return; 
    }
    
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description || null,
        capacity: capacity ? parseInt(capacity) : null,
        is_active: isActive
      };

      if (editItem) {
        await supabase.from('locations').update(payload).eq('id', editItem.id);
      } else {
        await supabase.from('locations').insert(payload);
      }
      
      addToast({ type: 'success', title: editItem ? 'Local atualizado!' : 'Local criado!' });
      setModalOpen(false); 
      resetForm(); 
      fetchData();
    } catch { 
      addToast({ type: 'error', title: 'Erro ao salvar' }); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <ProtectedRoute requireLeadership>
      <Header title="Locais Físicos" onMenuToggle={() => {}}>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setModalOpen(true); }}>
          ➕ Novo Local
        </button>
      </Header>
      
      <div className="app-content">
        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><MapPin size={48} color="var(--text-tertiary)" /></div>
            <div className="empty-state-title">Nenhum local cadastrado</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>Cadastre a nave da igreja, salão jovem, salas, etc.</p>
            <button className="btn btn-primary" onClick={() => { resetForm(); setModalOpen(true); }}>➕ Criar Local</button>
          </div>
        ) : (
          <div className="grid grid-3">
            {items.map(item => (
              <div key={item.id} className="card card-hover" onClick={() => openEdit(item)} style={{ cursor: 'pointer' }}>
                <div className="card-header">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <MapPin size={18} color="var(--primary)" />
                    {item.name}
                  </h3>
                  {!item.is_active && <span className="badge badge-neutral">Inativo</span>}
                </div>
                {item.description && <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-2)' }}>{item.description}</p>}
                {item.capacity && (
                  <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                    Capacidade: {item.capacity} pessoas
                  </div>
                )}
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
          <form id="local-form" onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Nave Principal" required autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes adicionais (opcional)" rows={2} />
            </div>
            <div className="form-group">
              <label className="form-label">Capacidade (Pessoas)</label>
              <input type="number" className="form-input" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Ex: 500" min="1" />
            </div>
            <div className="form-checkbox-group">
              <input type="checkbox" id="loc_active" className="form-checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <label htmlFor="loc_active" className="form-checkbox-label">Ativo (aparecerá nas listas)</label>
            </div>
          </form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
}
