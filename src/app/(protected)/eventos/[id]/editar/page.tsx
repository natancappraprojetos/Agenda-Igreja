'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';

export default function EditarEventoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Event
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !event) {
      addToast({ type: 'error', title: 'Evento não encontrado' });
      router.push('/agenda');
      return;
    }

    setTitle(event.title);
    setDate(event.date);
    setStartTime(event.start_time.substring(0,5));
    setEndTime(event.end_time ? event.end_time.substring(0,5) : '');
    setLocationId(event.location_id || '');

    // Fetch Locations
    const { data: locs } = await supabase.from('locations').select('*').eq('is_active', true).order('name');
    if (locs) setLocations(locs);

    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !startTime) {
      addToast({ type: 'error', title: 'Preencha os campos obrigatórios' });
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('events')
      .update({
        title,
        date,
        start_time: startTime,
        end_time: endTime || null,
        location_id: locationId || null
      })
      .eq('id', params.id);

    if (error) {
      addToast({ type: 'error', title: 'Erro ao salvar evento', description: error.message });
      setSaving(false);
    } else {
      addToast({ type: 'success', title: 'Evento atualizado com sucesso!' });
      router.push(`/eventos/${params.id}`);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <>
      <Header title={`Editar: ${title}`} onMenuToggle={() => {}}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/eventos/${params.id}`)} style={{ marginRight: '8px' }}>
          Cancelar
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </Header>

      <div className="app-content">
        <div className="card" style={{ maxWidth: 600, padding: 'var(--space-6)', margin: '0 auto' }}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Título do Evento *</label>
              <input 
                type="text" 
                className="input" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data *</label>
                <input 
                  type="date" 
                  className="input" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  required 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Início *</label>
                  <input 
                    type="time" 
                    className="input" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Fim</label>
                  <input 
                    type="time" 
                    className="input" 
                    value={endTime} 
                    onChange={e => setEndTime(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Local</label>
              <select 
                className="input" 
                value={locationId} 
                onChange={e => setLocationId(e.target.value)}
              >
                <option value="">Selecione um local...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
              * Para alterar Ministérios, Diaconato ou outras necessidades, exclua e crie um novo evento ou fale com um administrador.
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
