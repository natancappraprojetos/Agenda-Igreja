'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import Header from '@/components/layout/Header';
import { canManageEvent } from '@/lib/utils/permissions';
import { deleteEventAction } from '@/app/actions';

export default function EditarEventoPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();
  const { user, roles, isLeadership, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventData, setEventData] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationId, setLocationId] = useState('');
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [params.id, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Event
    const { data: event, error } = await supabase
      .from('events')
      .select('*, event_type:event_types(name)')
      .eq('id', params.id as string)
      .single();

    if (error || !event) {
      addToast({ type: 'error', title: 'Evento não encontrado' });
      router.push('/');
      return;
    }

    // Check permissions
    const { canEdit } = canManageEvent(event, user, roles, isLeadership);
    if (!canEdit) {
      addToast({ type: 'error', title: 'Acesso negado', message: 'Você não tem permissão para editar este evento.' });
      router.push(`/eventos/${params.id}`);
      return;
    }

    setEventData(event);
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
      .eq('id', params.id as string);

    if (error) {
      addToast({ type: 'error', title: 'Erro ao salvar evento', message: error.message });
      setSaving(false);
    } else {
      addToast({ type: 'success', title: 'Evento atualizado com sucesso!' });
      router.push(`/eventos/${params.id}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Deseja realmente excluir este evento? Esta ação não pode ser desfeita.')) return;
    try {
      setSaving(true);
      const res = await deleteEventAction(params.id as string);
      if (res.success) {
        addToast({ type: 'success', title: 'Evento excluído com sucesso!' });
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      addToast({ type: 'error', title: 'Erro ao excluir evento', message: err.message });
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  const { canDelete } = canManageEvent(eventData, user, roles, isLeadership);

  return (
    <>
      <Header title={`Editar: ${title}`} onMenuToggle={() => {}}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/eventos/${params.id}`)} style={{ marginRight: '8px' }}>
          Cancelar
        </button>
        {canDelete && (
          <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={saving} style={{ marginRight: '8px' }}>
            🗑️ Excluir Evento
          </button>
        )}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', alignItems: 'end' }}>
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
            
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
              * Para alterar Ministérios, Diaconato ou outras necessidades, exclua e crie um novo evento ou fale com um administrador.
            </p>

            {canDelete && (
              <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-danger)', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" onClick={handleDelete} className="btn btn-danger btn-sm" disabled={saving}>
                  🗑️ Excluir este evento permanentemente
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
