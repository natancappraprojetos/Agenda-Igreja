'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import type { Role } from '@/lib/types';

export default function FuncoesPage() {
  const [items, setItems] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Role['category']>('liturgy');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('roles').select('*').order('sort_order').order('name');
    setItems((data || []) as Role[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => { 
    setName(''); setDescription(''); setCategory('liturgy'); setIsActive(true); setSortOrder('0'); setEditItem(null); 
  };

  const openEdit = (item: Role) => {
    setEditItem(item); setName(item.name); setDescription(item.description || '');
    setCategory(item.category); setIsActive(item.is_active); setSortOrder(item.sort_order.toString()); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) { addToast({ type: 'error', title: 'Nome obrigatório' }); return; }
    setSaving(true);
    try {
      const payload = { 
        name: name.trim(), description: description || null, 
        category: category || null, is_active: isActive, sort_order: parseInt(sortOrder) || 0 
      };
      if (editItem) {
        await supabase.from('roles').update(payload).eq('id', editItem.id);
      } else {
        await supabase.from('roles').insert(payload);
      }
      addToast({ type: 'success', title: editItem ? 'Função atualizada!' : 'Função criada!' });
      setModalOpen(false); resetForm(); fetchData();
    } catch (err: any) { 
      if (err?.code === '23505') {
        addToast({ type: 'error', title: 'Função já existe', message: 'Já existe uma função com este nome.' });
      } else {
        addToast({ type: 'error', title: 'Erro ao salvar' }); 
      }
    } finally { setSaving(false); }
  };

  return (
    <>
      <Header title="Funções" onMenuToggle={() => {}}>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setModalOpen(true); }}>
          ➕ Nova Função
        </button>
      </Header>
      <div className="app-content">
        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔧</div>
            <div className="empty-state-title">Nenhuma função cadastrada</div>
            <button className="btn btn-primary" onClick={() => { resetForm(); setModalOpen(true); }}>➕ Criar Função</button>
          </div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>Descrição</th>
                  <th>Status</th>
                  <th>Ordem</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>
                      {item.category === 'liturgy' && <span className="badge badge-primary">Liturgia</span>}
                      {item.category === 'administrative' && <span className="badge badge-secondary">Administrativa</span>}
                      {item.category === 'operational' && <span className="badge badge-neutral">Operacional</span>}
                      {item.category === 'musical' && <span className="badge badge-primary">Musical</span>}
                      {!item.category && <span className="badge badge-neutral">Geral</span>}
                    </td>
                    <td>{item.description || '—'}</td>
                    <td>
                      {item.is_active ? <span className="badge badge-success">Ativa</span> : <span className="badge badge-neutral">Inativa</span>}
                    </td>
                    <td>{item.sort_order}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>✏️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}
          title={editItem ? 'Editar Função' : 'Nova Função'}
          footer={<>
            <button className="btn btn-secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </>}
        >
          <div className="form-group">
            <label className="form-label">Nome *</label>
            <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Pregador, Ancião..." autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <select className="form-input" value={category || ''} onChange={e => setCategory(e.target.value as any)}>
              <option value="">Geral</option>
              <option value="liturgy">Liturgia</option>
              <option value="administrative">Administrativa</option>
              <option value="operational">Operacional</option>
              <option value="musical">Musical</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Opcional" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Ordem de Exibição</label>
              <input type="number" className="form-input" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
            </div>
            <div className="form-checkbox-group" style={{ marginTop: '28px' }}>
              <input type="checkbox" id="role_active" className="form-checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <label htmlFor="role_active" className="form-checkbox-label">Ativa</label>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
