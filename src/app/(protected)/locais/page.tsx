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
  image_url?: string;
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
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

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
    setImageUrl('');
    setImageFile(null);
    setEditItem(null); 
  };

  const openEdit = (item: Location) => {
    setEditItem(item); 
    setName(item.name); 
    setDescription(item.description || '');
    setCapacity(item.capacity?.toString() || ''); 
    setIsActive(item.is_active); 
    setImageUrl(item.image_url || '');
    setImageFile(null);
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
      let finalImageUrl = imageUrl;
      
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('locations')
          .upload(filePath, imageFile);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('locations')
          .getPublicUrl(filePath);
          
        finalImageUrl = publicUrl;
      }

      const payload = {
        name: name.trim(),
        description: description || null,
        capacity: capacity ? parseInt(capacity) : null,
        is_active: isActive,
        image_url: finalImageUrl || null
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
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={{ width: 24, height: 24, borderRadius: '4px', objectFit: 'cover' }} />
                    ) : (
                      <MapPin size={18} color="var(--primary)" />
                    )}
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
            
            <div className="form-group">
              <label className="form-label">Foto do Local</label>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                {(imageFile || imageUrl) ? (
                  <div style={{ position: 'relative', width: 64, height: 64, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <img 
                      src={imageFile ? URL.createObjectURL(imageFile) : imageUrl} 
                      alt="Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <button 
                      type="button" 
                      onClick={() => { setImageFile(null); setImageUrl(''); }}
                      style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '0 0 0 4px', cursor: 'pointer', padding: '2px 4px' }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border)' }}>
                    <MapPin size={24} color="var(--text-tertiary)" />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setImageFile(e.target.files[0]);
                      }
                    }}
                    style={{ display: 'block', width: '100%', fontSize: '0.9rem' }}
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    Tamanho recomendado: 400x400 (JPG, PNG).
                  </p>
                </div>
              </div>
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
