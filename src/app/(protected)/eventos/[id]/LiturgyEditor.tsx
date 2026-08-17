'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import PersonSelect from '@/components/ui/PersonSelect';
import SongSelect from '@/components/ui/SongSelect';

interface LiturgyEditorProps {
  eventId: string;
  eventStartTime: string;
  itemTypes: any[];
}

export default function LiturgyEditor({ eventId, eventStartTime, itemTypes }: LiturgyEditorProps) {
  const supabase = createClient();
  const { addToast } = useToast();

  const [liturgyId, setLiturgyId] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newItemTypeId, setNewItemTypeId] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDuration, setNewItemDuration] = useState(5);
  const [newItemPersonId, setNewItemPersonId] = useState('');
  const [newItemSongId, setNewItemSongId] = useState('');

  useEffect(() => {
    fetchLiturgy();
  }, [eventId]);

  const fetchLiturgy = async () => {
    setLoading(true);
    let { data: lit } = await supabase.from('liturgies').select('id, start_time').eq('event_id', eventId).single();
    
    if (!lit) {
      // Create empty liturgy
      const { data: newLit, error } = await supabase.from('liturgies').insert({
        event_id: eventId,
        start_time: eventStartTime
      }).select().single();
      
      if (!error && newLit) {
        lit = newLit;
      }
    }

    if (lit) {
      setLiturgyId(lit.id);
      const { data: itemsData } = await supabase
        .from('liturgy_items')
        .select('*, person:people(name), song:songs(title, artist), item_type:liturgy_item_types(name, icon)')
        .eq('liturgy_id', lit.id)
        .order('order_index');
      if (itemsData) setItems(itemsData);
    }
    setLoading(false);
  };

  const calculateTimes = (itemsToCalc: any[]) => {
    let currentTime = new Date(`1970-01-01T${eventStartTime}`);
    
    return itemsToCalc.map(item => {
      const calculated_time = currentTime.toTimeString().substring(0, 8);
      currentTime.setMinutes(currentTime.getMinutes() + item.duration_minutes);
      return { ...item, calculated_time };
    });
  };

  const handleAddItem = async () => {
    if (!liturgyId || !newItemTitle || !newItemTypeId) {
      addToast({ type: 'error', title: 'Preencha o Tipo e Título do item.' });
      return;
    }

    const nextOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index)) + 1 : 0;

    const payload = {
      liturgy_id: liturgyId,
      item_type_id: newItemTypeId,
      title: newItemTitle,
      duration_minutes: newItemDuration,
      order_index: nextOrder,
      responsible_person_id: newItemPersonId || null,
      song_id: newItemSongId || null
    };

    const { error } = await supabase.from('liturgy_items').insert(payload);
    
    if (error) {
      addToast({ type: 'error', title: 'Erro ao adicionar item.' });
    } else {
      // Reset form
      setNewItemTitle('');
      setNewItemPersonId('');
      setNewItemSongId('');
      setNewItemDuration(5);
      fetchLiturgy();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Excluir este item da programação?')) return;
    await supabase.from('liturgy_items').delete().eq('id', itemId);
    fetchLiturgy();
  };

  const calculatedItems = calculateTimes(items);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Carregando Liturgia...</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-6)', alignItems: 'start' }}>
      {/* Editor List */}
      <div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)' }}>Ordem do Culto</h3>
        
        {calculatedItems.length === 0 ? (
           <p style={{ color: 'var(--text-secondary)' }}>A ordem do culto está vazia. Adicione os blocos ao lado.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {calculatedItems.map((item, idx) => (
              <div key={item.id} className="card" style={{ padding: 'var(--space-3)', display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, color: 'var(--primary)', width: '60px' }}>
                  {item.calculated_time.substring(0, 5)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{item.item_type?.icon}</span>
                    <strong style={{ fontSize: '1.1rem' }}>{item.title}</strong>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>({item.duration_minutes} min)</span>
                  </div>
                  {(item.person || item.song) && (
                    <div style={{ marginTop: '4px', display: 'flex', gap: 'var(--space-3)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {item.person && <span>👤 {item.person.name}</span>}
                      {item.song && <span>🎵 {item.song.title}</span>}
                    </div>
                  )}
                </div>

                <button 
                  className="btn btn-ghost btn-sm" 
                  style={{ color: 'var(--danger)' }}
                  onClick={() => handleDeleteItem(item.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Form Sidebar */}
      <div className="card" style={{ padding: 'var(--space-4)', position: 'sticky', top: '80px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Adicionar Bloco</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Tipo de Bloco *</label>
            <select className="form-input" value={newItemTypeId} onChange={e => {
              setNewItemTypeId(e.target.value);
              const type = itemTypes.find(t => t.id === e.target.value);
              if (type && !newItemTitle) setNewItemTitle(type.name);
              if (type) setNewItemDuration(type.default_duration_minutes);
            }}>
              <option value="">Selecione...</option>
              {itemTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Título *</label>
            <input type="text" className="form-input" value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)} placeholder="Ex: Hino Inicial" />
          </div>

          <div className="form-group">
            <label className="form-label">Duração (minutos) *</label>
            <input type="number" className="form-input" value={newItemDuration} onChange={e => setNewItemDuration(Number(e.target.value))} min={1} />
          </div>

          <PersonSelect 
            label="Responsável (Opcional)" 
            value={newItemPersonId} 
            onChange={val => setNewItemPersonId(val || '')} 
          />

          <SongSelect 
            label="Música (Opcional)" 
            value={newItemSongId} 
            onChange={val => setNewItemSongId(val || '')} 
          />

          <button className="btn btn-primary" onClick={handleAddItem} style={{ marginTop: 'var(--space-2)' }}>
            + Adicionar à Liturgia
          </button>
        </div>
      </div>

    </div>
  );
}
