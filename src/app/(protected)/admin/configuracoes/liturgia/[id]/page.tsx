'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { GripVertical, Clock, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react';

interface TemplateItem {
  id: string;
  template_id: string;
  item_type_id: string;
  title: string;
  order_index: number;
  default_duration_minutes: number;
  notes: string | null;
  type?: {
    icon: string;
    name: string;
  };
}

interface ItemType {
  id: string;
  name: string;
  icon: string;
  default_duration_minutes: number;
}

export default function LiturgiaBuilderPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<{ id: string; name: string; description: string } | null>(null);
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [availableTypes, setAvailableTypes] = useState<ItemType[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<TemplateItem | null>(null);
  
  // Edit Form
  const [editTitle, setEditTitle] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    
    // Fetch Template
    const { data: tplData, error: tplError } = await supabase
      .from('liturgy_templates')
      .select('*')
      .eq('id', params.id)
      .single();

    if (tplError || !tplData) {
      addToast({ type: 'error', title: 'Modelo não encontrado' });
      router.push('/admin/configuracoes');
      return;
    }
    setTemplate(tplData);

    // Fetch Template Items
    const { data: itemsData } = await supabase
      .from('liturgy_template_items')
      .select('*, type:liturgy_item_types(name, icon)')
      .eq('template_id', params.id)
      .order('order_index');
    setItems(itemsData || []);

    // Fetch Global Item Types
    const { data: typesData } = await supabase
      .from('liturgy_item_types')
      .select('*')
      .order('sort_order');
    setAvailableTypes(typesData || []);

    setLoading(false);
  }, [params.id, supabase, addToast, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddItem = async (type: ItemType) => {
    const newOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index)) + 1 : 1;
    
    const { error } = await supabase.from('liturgy_template_items').insert({
      template_id: params.id,
      item_type_id: type.id,
      title: type.name, // By default the title is the type name
      order_index: newOrder,
      default_duration_minutes: type.default_duration_minutes
    });

    if (error) {
      addToast({ type: 'error', title: 'Erro ao adicionar item' });
    } else {
      setShowAddModal(false);
      fetchData();
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('Remover este item da liturgia?')) return;
    const { error } = await supabase.from('liturgy_template_items').delete().eq('id', itemId);
    if (!error) fetchData();
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap items
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Update state immediately for UX
    setItems(newItems.map((item, i) => ({ ...item, order_index: i + 1 })));

    // Save to DB
    const updates = [
      { id: newItems[index].id, order_index: index + 1 },
      { id: newItems[targetIndex].id, order_index: targetIndex + 1 }
    ];

    for (const update of updates) {
      await supabase.from('liturgy_template_items').update({ order_index: update.order_index }).eq('id', update.id);
    }
  };

  const openEdit = (item: TemplateItem) => {
    setEditItem(item);
    setEditTitle(item.title);
    setEditDuration(item.default_duration_minutes.toString());
    setEditNotes(item.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    setSaving(true);
    const { error } = await supabase.from('liturgy_template_items').update({
      title: editTitle,
      default_duration_minutes: parseInt(editDuration) || 0,
      notes: editNotes || null
    }).eq('id', editItem.id);

    if (error) {
      addToast({ type: 'error', title: 'Erro ao salvar' });
    } else {
      setEditItem(null);
      fetchData();
    }
    setSaving(false);
  };

  if (loading) return <div className="loading-page"><div className="spinner spinner-lg" /></div>;
  if (!template) return null;

  const totalTime = items.reduce((acc, curr) => acc + curr.default_duration_minutes, 0);

  return (
    <>
      <Header title={`Construtor: ${template.name}`} onMenuToggle={() => {}}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/admin/configuracoes')} style={{ marginRight: '8px' }}>
          Voltar
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Adicionar Parte
        </button>
      </Header>

      <div className="app-content">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-1)' }}>A Estrutura do Culto</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Defina a ordem das coisas e os tempos previstos.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', backgroundColor: 'var(--bg-card)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)', fontWeight: 600 }}>
              <Clock size={16} color="var(--primary)" />
              Total Estimado: {totalTime} min
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {items.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>Este modelo de culto ainda está vazio.</p>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                  <Plus size={16} /> Adicionar a primeira parte
                </button>
              </div>
            ) : (
              items.map((item, index) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', backgroundColor: 'var(--bg-card)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  
                  {/* Order Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button className="btn btn-ghost" style={{ padding: '2px 4px', minHeight: 0 }} disabled={index === 0} onClick={() => moveItem(index, 'up')}>
                      <ArrowUp size={14} />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '2px 4px', minHeight: 0 }} disabled={index === items.length - 1} onClick={() => moveItem(index, 'down')}>
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  {/* Icon */}
                  <div style={{ fontSize: '1.5rem', width: 40, textAlign: 'center' }}>
                    {item.type?.icon || '📌'}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openEdit(item)}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {item.title}
                      {item.notes && <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>Com notas</span>}
                    </div>
                    {item.title !== item.type?.name && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Tipo: {item.type?.name}</div>
                    )}
                  </div>

                  {/* Duration & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> {item.default_duration_minutes} min
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleRemoveItem(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Select Item Type Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Adicionar Parte ao Culto">
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          Selecione a peça que deseja encaixar na liturgia deste culto:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', maxHeight: '60vh', overflowY: 'auto', padding: '4px' }}>
          {availableTypes.map(type => (
            <button 
              key={type.id} 
              className="card card-hover" 
              style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', textAlign: 'left', border: '1px solid var(--border-color)', cursor: 'pointer', background: 'none' }}
              onClick={() => handleAddItem(type)}
            >
              <span style={{ fontSize: '1.5rem' }}>{type.icon}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{type.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{type.default_duration_minutes} min</div>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Editar Detalhes" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setEditItem(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </>
      }>
        <form onSubmit={handleSaveEdit}>
          <div className="form-group">
            <label className="form-label">Título da Parte</label>
            <input type="text" className="form-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
            <span className="form-help">Mude se quiser ser mais específico (Ex: "Louvor Congregacional" virar "2 Músicas de Louvor")</span>
          </div>
          <div className="form-group">
            <label className="form-label">Tempo Estimado (minutos)</label>
            <input type="number" className="form-input" value={editDuration} onChange={e => setEditDuration(e.target.value)} min="1" required />
          </div>
          <div className="form-group">
            <label className="form-label">Orientações Específicas</label>
            <textarea className="form-textarea" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Ex: Chamar as crianças à frente" rows={3} />
          </div>
        </form>
      </Modal>
    </>
  );
}
