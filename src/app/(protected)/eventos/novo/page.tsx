'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import PersonSelect from '@/components/ui/PersonSelect';
import type { EventType, Location, Ministry } from '@/lib/types';

export default function NovoEventoPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // References data
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventTypeId, setEventTypeId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [ministryId, setMinistryId] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [description, setDescription] = useState('');

  // Needs Toggles
  const [needsSound, setNeedsSound] = useState(true);
  const [needsWorship, setNeedsWorship] = useState(true);
  const [needsDeaconry, setNeedsDeaconry] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [etRes, locRes, minRes] = await Promise.all([
        supabase.from('event_types').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('locations').select('*').eq('is_active', true).order('name'),
        supabase.from('ministries').select('*').eq('is_active', true).order('name')
      ]);

      if (etRes.data) { setEventTypes(etRes.data as EventType[]); if (etRes.data.length > 0) setEventTypeId(etRes.data[0].id); }
      if (locRes.data) setLocations(locRes.data as Location[]);
      if (minRes.data) setMinistries(minRes.data as Ministry[]);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const handleSave = async () => {
    if (!title || !date || !startTime || !eventTypeId) {
      addToast({ type: 'error', title: 'Preencha todos os campos com *' });
      return;
    }

    setSaving(true);
    try {
      // Get logged in user to set as creator
      const { data: { user } } = await supabase.auth.getUser();

      const payload = {
        title, date, start_time: startTime,
        end_time: endTime || null,
        event_type_id: eventTypeId,
        location_id: locationId || null,
        ministry_id: ministryId || null,
        responsible_person_id: responsibleId || null,
        description: description || null,
        needs_sound: needsSound,
        needs_worship: needsWorship,
        needs_deaconry: needsDeaconry,
        created_by: user?.id,
        status: 'scheduled'
      };

      const { data, error } = await supabase.from('events').insert(payload).select().single();
      if (error) throw error;

      addToast({ type: 'success', title: 'Evento criado com sucesso!' });
      router.push(`/eventos/${data.id}`); // Redirect to edit/liturgy view
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao criar evento' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header title="Novo Evento" onMenuToggle={() => {}}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.back()} style={{ marginRight: '8px' }}>
          Cancelar
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar e Configurar Liturgia ➔'}
        </button>
      </Header>

      <div className="app-content">
        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : (
          <div className="card" style={{ padding: 'var(--space-6)', maxWidth: 800, margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
              1. Informações Principais
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <select className="form-input" value={eventTypeId} onChange={e => setEventTypeId(e.target.value)}>
                  {eventTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Culto Divino Especial" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Hora Início *</label>
                <input type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Hora Fim (Previsto)</label>
                <input type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Local</label>
                <select className="form-input" value={locationId} onChange={e => setLocationId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ministério Responsável</label>
                <select className="form-input" value={ministryId} onChange={e => setMinistryId(e.target.value)}>
                  <option value="">Geral da Igreja</option>
                  {ministries.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-6)' }}>
              <PersonSelect 
                label="Responsável pelo Evento" 
                value={responsibleId} 
                onChange={setResponsibleId} 
                placeholder="Busque ou cadastre uma pessoa..." 
              />
            </div>

            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
              2. Necessidades do Evento
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', fontSize: '0.9rem' }}>
              Marque o que este evento vai precisar. Isso vai criar as pendências corretas na agenda geral.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
              <div className="card" style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <input type="checkbox" id="ns" className="form-checkbox" checked={needsSound} onChange={e => setNeedsSound(e.target.checked)} />
                <label htmlFor="ns" style={{ fontWeight: 600, cursor: 'pointer' }}>Mídia / Som</label>
              </div>
              <div className="card" style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <input type="checkbox" id="nw" className="form-checkbox" checked={needsWorship} onChange={e => setNeedsWorship(e.target.checked)} />
                <label htmlFor="nw" style={{ fontWeight: 600, cursor: 'pointer' }}>Louvor</label>
              </div>
              <div className="card" style={{ padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <input type="checkbox" id="nd" className="form-checkbox" checked={needsDeaconry} onChange={e => setNeedsDeaconry(e.target.checked)} />
                <label htmlFor="nd" style={{ fontWeight: 600, cursor: 'pointer' }}>Diaconato</label>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
