'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { EventType, Location, Ministry } from '@/lib/types';
import { useToast } from '@/lib/hooks/useToast';

const TOTAL_STEPS = 7;

export default function PublicAgendarWizard() {
  const supabase = createClient();
  const { addToast } = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Reference Data
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [needTypes, setNeedTypes] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);

  // Form Data
  const [eventTypeId, setEventTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationId, setLocationId] = useState('');
  const [ministryId, setMinistryId] = useState('');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [solicitanteId, setSolicitanteId] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [notes, setNotes] = useState('');

  // Conflicts
  const [locationConflicts, setLocationConflicts] = useState<Array<any>>([]);

  const fetchReferenceData = useCallback(async () => {
    setLoading(true);
    const [types, locs, mins, needsData, ppl] = await Promise.all([
      supabase.from('event_types').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('locations').select('*').eq('is_active', true).order('name'),
      supabase.from('ministries').select('*').eq('is_active', true).order('name'),
      supabase.from('event_needs_types').select('*').eq('is_active', true).order('name'),
      supabase.from('people').select('id, name').eq('is_active', true).order('name')
    ]);
    if (types.data) setEventTypes(types.data as EventType[]);
    if (locs.data) setLocations(locs.data as Location[]);
    if (mins.data) setMinistries(mins.data as Ministry[]);
    if (needsData.data) setNeedTypes(needsData.data);
    if (ppl.data) setPeople(ppl.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchReferenceData(); }, [fetchReferenceData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const dateParam = searchParams.get('date');
      if (dateParam) setDate(dateParam);
    }
  }, []);

  // Auto-set title based on event type
  useEffect(() => {
    if (eventTypeId && !title) {
      const type = eventTypes.find(t => t.id === eventTypeId);
      if (type) setTitle(type.name);
    }
  }, [eventTypeId, title, eventTypes]);

  // Check location conflicts
  const checkLocationConflict = useCallback(async () => {
    if (!locationId || !date || !startTime) return;
    const { data } = await supabase.rpc('check_location_conflict', {
      p_location_id: locationId,
      p_date: date,
      p_start_time: startTime,
      p_end_time: endTime || null,
    });
    setLocationConflicts(data || []);
  }, [locationId, date, startTime, endTime, supabase]);

  useEffect(() => { checkLocationConflict(); }, [checkLocationConflict]);

  const canProceed = () => {
    switch (step) {
      case 1: return !!eventTypeId;
      case 2: return !!date && !!startTime && !!title;
      case 3: return locationConflicts.length === 0; // location optional but blocks if conflict
      case 4: return true; // ministry optional
      case 5: return true; // needs optional
      case 6: return solicitanteId === 'outro' ? !!solicitante.trim() : !!solicitanteId; // identificação mandatory
      case 7: return true; // review
      default: return false;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // General conflict check (same time)
      const { data: conflicts, error: conflictError } = await supabase
        .from('events')
        .select('id, title, start_time')
        .eq('date', date)
        .neq('status', 'cancelled');
        
      if (conflictError) throw conflictError;

      const exactConflict = conflicts?.find(c => c.start_time.substring(0, 5) === startTime);
      if (exactConflict) {
        if (!confirm(`⚠️ Atenção: Já existe um evento ("${exactConflict.title}") agendado para o mesmo dia às ${startTime}. Deseja agendar neste horário mesmo assim? (Pode ser em outro local da igreja)`)) {
          setSaving(false);
          return;
        }
      }

      const personName = solicitanteId === 'outro' ? solicitante.trim() : (people.find(p => p.id === solicitanteId)?.name || solicitante.trim());
      
      const payload = {
        title: title.trim(),
        event_type_id: eventTypeId,
        date: date,
        start_time: startTime,
        end_time: endTime || null,
        location_id: locationId || null,
        ministry_id: ministryId || null,
        description: `Solicitado por: ${personName}`,
        notes: notes.trim() || null,
        status: 'scheduled'
      };

      const { data: insertedEvent, error } = await supabase.from('events').insert(payload).select().single();
      if (error) throw error;

      if (selectedNeeds.length > 0 && insertedEvent) {
        const needsPayload = selectedNeeds.map(needId => ({
          event_id: insertedEvent.id,
          need_type_id: needId
        }));
        await supabase.from('event_needs').insert(needsPayload);
      }
      
      setSuccess(true);
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Erro ao agendar evento' });
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--space-2)' }}>Agendamento Concluído!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            Seu evento foi adicionado à agenda da igreja. A liderança poderá revisar e ajustar os detalhes, se necessário.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.location.reload()}>
              Novo Agendamento
            </button>
            <Link href="/" className="btn btn-secondary" style={{ flex: 1, textDecoration: 'none' }}>
              Ver Agenda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getEventTypeName = (id: string) => {
    const t = eventTypes.find(t => t.id === id);
    return t ? `${t.icon} ${t.name}` : '—';
  };
  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name || '—';
  const getMinistryName = (id: string) => ministries.find(m => m.id === id)?.name || '—';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', paddingBottom: 'var(--space-8)' }}>
      <header style={{ 
        backgroundColor: 'var(--primary)', padding: 'var(--space-4)', color: 'white',
        position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 'var(--space-4)'
      }}>
        <Link href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '1.5rem' }}>←</Link>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Solicitar Agendamento</h1>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--space-4)' }}>
        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : (
          <div className="wizard">
            <div className="wizard-progress">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div className={`wizard-step-dot ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'completed' : ''}`} />
                  {i < TOTAL_STEPS - 1 && <div className={`wizard-step-line ${i + 1 < step ? 'completed' : ''}`} />}
                </div>
              ))}
            </div>

            {/* Step 1: Event Type */}
            {step === 1 && (
              <div className="wizard-step">
                <h2 className="wizard-step-title">Qual tipo de evento?</h2>
                <div className="wizard-options">
                  {eventTypes.map(type => (
                    <div key={type.id} className={`wizard-option ${eventTypeId === type.id ? 'selected' : ''}`} onClick={() => {
                      setEventTypeId(type.id);
                      setTimeout(() => setStep(2), 200);
                    }}>
                      <span className="wizard-option-icon">{type.icon}</span>
                      <span className="wizard-option-label">{type.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Date & Time */}
            {step === 2 && (
              <div className="wizard-step">
                <h2 className="wizard-step-title">Quando será?</h2>
                <div className="form-group">
                  <label className="form-label">📅 Data</label>
                  <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="form-group">
                    <label className="form-label">🕐 Início</label>
                    <input type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🕐 Término <span className="form-label-optional">(opcional)</span></label>
                    <input type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Título do Evento</label>
                  <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Culto de Quarta" />
                </div>
              </div>
            )}

            {/* Step 3: Location */}
            {step === 3 && (
              <div className="wizard-step">
                <h2 className="wizard-step-title">Onde será?</h2>
                <select className="form-input" value={locationId} onChange={e => setLocationId(e.target.value)} size={5} style={{ height: 'auto' }}>
                  <option value="">Não definido / Outro local</option>
                  {locations.map(l => <option key={l.id} value={l.id} style={{ padding: '8px' }}>📍 {l.name}</option>)}
                </select>
                {locationConflicts.length > 0 && (
                  <div className="conflict-alert mt-4">
                    <span className="conflict-alert-icon">⚠️</span>
                    <div>
                      <div className="conflict-alert-title">Já existe um evento agendado neste local e horário:</div>
                      {locationConflicts.map((c, i) => (
                        <div key={i} className="conflict-alert-message">
                          {c.event_title} — {c.event_start_time?.substring(0, 5)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Ministry */}
            {step === 4 && (
              <div className="wizard-step">
                <h2 className="wizard-step-title">Qual ministério?</h2>
                <p className="wizard-step-subtitle">De qual ministério é este evento? (Opcional)</p>
                <div className="wizard-options list-mode">
                  <div className={`wizard-option ${ministryId === '' ? 'selected' : ''}`} onClick={() => {
                    setMinistryId('');
                    setTimeout(() => setStep(5), 200);
                  }}>
                    <span className="wizard-option-icon">🌐</span>
                    <span className="wizard-option-label">Geral / Toda a Igreja</span>
                  </div>
                  {ministries.map(m => (
                    <div key={m.id} className={`wizard-option ${ministryId === m.id ? 'selected' : ''}`} onClick={() => {
                      setMinistryId(m.id);
                      setTimeout(() => setStep(5), 200);
                    }}>
                      <span className="wizard-option-icon">{m.icon || '🏛️'}</span>
                      <span className="wizard-option-label">{m.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Needs */}
            {step === 5 && (
              <div className="wizard-step">
                <h2 className="wizard-step-title">Necessidades</h2>
                <p className="wizard-step-subtitle">Marque o que o evento precisará</p>
                {needTypes.map(need => (
                  <div key={need.id} className="form-checkbox-group" style={{ marginBottom: 'var(--space-2)' }}>
                    <input 
                      type="checkbox" 
                      id={`need_${need.id}`} 
                      className="form-checkbox" 
                      checked={selectedNeeds.includes(need.id)} 
                      onChange={e => {
                        if (e.target.checked) setSelectedNeeds([...selectedNeeds, need.id]);
                        else setSelectedNeeds(selectedNeeds.filter(id => id !== need.id));
                      }} 
                    />
                    <label htmlFor={`need_${need.id}`} className="form-checkbox-label">
                      {need.icon} Precisa de {need.name}
                    </label>
                  </div>
                ))}
                {needTypes.length === 0 && (
                  <p style={{ color: 'var(--text-secondary)' }}>Nenhuma necessidade especial cadastrada.</p>
                )}
              </div>
            )}

            {/* Step 6: Identification */}
            {step === 6 && (
              <div className="wizard-step">
                <h2 className="wizard-step-title">Identificação</h2>
                <p className="wizard-step-subtitle">Quem está solicitando este agendamento?</p>
                <div className="form-group">
                  <label className="form-label">Seu Nome / Cargo *</label>
                  <select className="form-input" value={solicitanteId} onChange={e => {
                    setSolicitanteId(e.target.value);
                    if (e.target.value !== 'outro') setSolicitante('');
                  }}>
                    <option value="">Selecione quem você é...</option>
                    {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value="outro">Outro (Não estou na lista)</option>
                  </select>
                </div>
                {solicitanteId === 'outro' && (
                  <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                    <label className="form-label">Digite seu nome completo *</label>
                    <input type="text" className="form-input" value={solicitante} onChange={e => setSolicitante(e.target.value)} placeholder="Ex: Irmã Maria (Diaconato)" autoFocus />
                  </div>
                )}
                <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                  <label className="form-label">Observações Internas (opcional)</label>
                  <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes adicionais para a liderança avaliar..." />
                </div>
              </div>
            )}

            {/* Step 7: Review */}
            {step === 7 && (
              <div className="wizard-step">
                <h2 className="wizard-step-title">Revisar e Agendar</h2>
                <div className="card">
                  <div className="review-grid">
                    <div className="review-section"><div className="review-label">Tipo</div><div className="review-value">{getEventTypeName(eventTypeId)}</div></div>
                    <div className="review-section"><div className="review-label">Título</div><div className="review-value">{title}</div></div>
                    <div className="review-section"><div className="review-label">Data e Hora</div><div className="review-value">{date} às {startTime}</div></div>
                    {locationId && <div className="review-section"><div className="review-label">📍 Local</div><div className="review-value">{getLocationName(locationId)}</div></div>}
                    {ministryId && <div className="review-section"><div className="review-label">🏛️ Ministério</div><div className="review-value">{getMinistryName(ministryId)}</div></div>}
                    <div className="review-section"><div className="review-label">👤 Solicitante</div><div className="review-value">{solicitanteId === 'outro' ? solicitante : (people.find(p => p.id === solicitanteId)?.name || '')}</div></div>
                  </div>
                  <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {selectedNeeds.map(needId => {
                      const need = needTypes.find(n => n.id === needId);
                      return need ? <span key={need.id} className="badge badge-info">{need.icon} {need.name}</span> : null;
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="wizard-actions">
              {step > 1 ? (
                <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>◀ Voltar</button>
              ) : (
                <Link href="/" className="btn btn-ghost">Cancelar</Link>
              )}
              {step < TOTAL_STEPS ? (
                <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>Próximo ▶</button>
              ) : (
                <button className="btn btn-success btn-lg" onClick={handleSave} disabled={saving || !canProceed()}>
                  {saving ? 'Agendando...' : '✅ Confirmar Agendamento'}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
