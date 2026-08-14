'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import SearchSelect from '@/components/ui/SearchSelect';
import type { EventType, Location, Ministry, Person } from '@/lib/types';

const TOTAL_STEPS = 8;

export default function NovoEventoPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  // Reference data
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  // Form data
  const [eventTypeId, setEventTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationId, setLocationId] = useState('');
  const [ministryId, setMinistryId] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [preacherId, setPreacherId] = useState('');
  const [worshipLeaderId, setWorshipLeaderId] = useState('');
  const [needsSound, setNeedsSound] = useState(false);
  const [soundPersonId, setSoundPersonId] = useState('');
  const [needsDeaconry, setNeedsDeaconry] = useState(false);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Conflicts
  const [locationConflicts, setLocationConflicts] = useState<Array<{ event_id: string; event_title: string; event_start_time: string; event_end_time: string }>>([]);
  const [personConflicts, setPersonConflicts] = useState<Array<{ person: string; event_title: string; event_start_time: string }>>([]);

  const fetchReferenceData = useCallback(async () => {
    setLoading(true);
    const [types, locs, mins, ppl] = await Promise.all([
      supabase.from('event_types').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('locations').select('*').eq('is_active', true).order('name'),
      supabase.from('ministries').select('*').eq('is_active', true).order('name'),
      supabase.from('people').select('*').eq('is_active', true).order('name'),
    ]);
    setEventTypes((types.data || []) as EventType[]);
    setLocations((locs.data || []) as Location[]);
    setMinistries((mins.data || []) as Ministry[]);
    setPeople((ppl.data || []) as Person[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchReferenceData(); }, [fetchReferenceData]);

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
      case 2: return !!date && !!startTime;
      case 3: return true; // location is optional
      case 4: return true; // ministry is optional
      case 5: return true; // people are optional
      case 6: return true; // needs are optional
      case 7: return true; // description is optional
      case 8: return true; // review
      default: return false;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.from('events').insert({
        title,
        event_type_id: eventTypeId,
        date,
        start_time: startTime,
        end_time: endTime || null,
        location_id: locationId || null,
        ministry_id: ministryId || null,
        responsible_person_id: responsibleId || null,
        preacher_id: preacherId || null,
        worship_leader_id: worshipLeaderId || null,
        needs_sound: needsSound,
        sound_person_id: soundPersonId || null,
        needs_worship: !!worshipLeaderId,
        needs_deaconry: needsDeaconry,
        description: description || null,
        notes: notes || null,
        status: 'scheduled',
      }).select().single();

      if (error) throw error;

      // Create schedule entries for assigned people
      const scheduleEntries = [];
      if (preacherId) scheduleEntries.push({ event_id: data.id, person_id: preacherId, date, start_time: startTime, end_time: endTime || null });
      if (worshipLeaderId) scheduleEntries.push({ event_id: data.id, person_id: worshipLeaderId, date, start_time: startTime, end_time: endTime || null });
      if (soundPersonId) scheduleEntries.push({ event_id: data.id, person_id: soundPersonId, date, start_time: startTime, end_time: endTime || null });
      if (responsibleId) scheduleEntries.push({ event_id: data.id, person_id: responsibleId, date, start_time: startTime, end_time: endTime || null });

      if (scheduleEntries.length > 0) {
        await supabase.from('schedules').insert(scheduleEntries);
      }

      addToast({ type: 'success', title: 'Evento criado!', message: `${title} foi adicionado à agenda.` });
      router.push('/agenda');
    } catch (error) {
      console.error('Error saving event:', error);
      addToast({ type: 'error', title: 'Erro ao salvar', message: 'Não foi possível criar o evento. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const getName = (id: string) => people.find(p => p.id === id)?.name || '—';
  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name || '—';
  const getMinistryName = (id: string) => ministries.find(m => m.id === id)?.name || '—';
  const getEventTypeName = (id: string) => {
    const t = eventTypes.find(t => t.id === id);
    return t ? `${t.icon} ${t.name}` : '—';
  };

  const peopleOptions = people.map(p => ({ id: p.id, label: p.name, sublabel: p.email || undefined }));
  const locationOptions = locations.map(l => ({ id: l.id, label: l.name, sublabel: l.description || undefined }));
  const ministryOptions = ministries.map(m => ({ id: m.id, label: m.name }));

  if (loading) {
    return (
      <>
        <Header title="Novo Evento" onMenuToggle={() => {}} />
        <div className="app-content">
          <div className="loading-page">
            <div className="spinner spinner-lg" />
            <span className="loading-text">Carregando...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Novo Evento" onMenuToggle={() => {}} />
      <div className="app-content">
        <div className="wizard">
          {/* Progress dots */}
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
              <p className="wizard-step-subtitle">Selecione o tipo do evento que deseja criar</p>
              <div className="wizard-options">
                {eventTypes.map(type => (
                  <div
                    key={type.id}
                    className={`wizard-option ${eventTypeId === type.id ? 'selected' : ''}`}
                    onClick={() => setEventTypeId(type.id)}
                  >
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
              <p className="wizard-step-subtitle">Defina a data e o horário do evento</p>
              <div className="form-group">
                <label className="form-label">📅 Data</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">🕐 Início</label>
                  <input
                    type="time"
                    className="form-input"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">🕐 Término <span className="form-label-optional">(opcional)</span></label>
                  <input
                    type="time"
                    className="form-input"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Título do Evento</label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Culto de Quarta"
                />
                <span className="form-hint">Preenchido automaticamente pelo tipo. Altere se necessário.</span>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Onde será?</h2>
              <p className="wizard-step-subtitle">Selecione o local do evento</p>
              <SearchSelect
                options={locationOptions}
                value={locationId}
                onChange={setLocationId}
                placeholder="Buscar local..."
              />
              {locationConflicts.length > 0 && (
                <div className="conflict-alert mt-4">
                  <span className="conflict-alert-icon">⚠️</span>
                  <div>
                    <div className="conflict-alert-title">Conflito de local!</div>
                    {locationConflicts.map((c, i) => (
                      <div key={i} className="conflict-alert-message">
                        {c.event_title} — {c.event_start_time?.substring(0, 5)}
                        {c.event_end_time && ` até ${c.event_end_time.substring(0, 5)}`}
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
              <p className="wizard-step-subtitle">Selecione o ministério responsável (opcional)</p>
              <SearchSelect
                options={ministryOptions}
                value={ministryId}
                onChange={setMinistryId}
                placeholder="Buscar ministério..."
              />
            </div>
          )}

          {/* Step 5: People */}
          {step === 5 && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Quem vai participar?</h2>
              <p className="wizard-step-subtitle">Defina os responsáveis pelo evento</p>

              <div className="form-group">
                <label className="form-label">👤 Responsável Principal</label>
                <SearchSelect
                  options={peopleOptions}
                  value={responsibleId}
                  onChange={setResponsibleId}
                  placeholder="Buscar pessoa..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">🎤 Pregador</label>
                <SearchSelect
                  options={peopleOptions}
                  value={preacherId}
                  onChange={setPreacherId}
                  placeholder="Buscar pregador..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">🎵 Responsável pelo Louvor</label>
                <SearchSelect
                  options={peopleOptions}
                  value={worshipLeaderId}
                  onChange={setWorshipLeaderId}
                  placeholder="Buscar pessoa..."
                />
              </div>
            </div>
          )}

          {/* Step 6: Needs */}
          {step === 6 && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Necessidades do evento</h2>
              <p className="wizard-step-subtitle">Configure o que o evento precisa</p>

              <div className="form-checkbox-group">
                <input
                  type="checkbox"
                  id="needs_sound"
                  className="form-checkbox"
                  checked={needsSound}
                  onChange={e => setNeedsSound(e.target.checked)}
                />
                <label htmlFor="needs_sound" className="form-checkbox-label">
                  🔊 Precisa de sonoplastia
                </label>
              </div>

              {needsSound && (
                <div className="form-group" style={{ marginLeft: 'var(--space-8)' }}>
                  <label className="form-label">Responsável pela Sonoplastia</label>
                  <SearchSelect
                    options={peopleOptions}
                    value={soundPersonId}
                    onChange={setSoundPersonId}
                    placeholder="Buscar sonoplasta..."
                  />
                </div>
              )}

              <div className="form-checkbox-group">
                <input
                  type="checkbox"
                  id="needs_deaconry"
                  className="form-checkbox"
                  checked={needsDeaconry}
                  onChange={e => setNeedsDeaconry(e.target.checked)}
                />
                <label htmlFor="needs_deaconry" className="form-checkbox-label">
                  👔 Precisa de diaconato
                </label>
              </div>
            </div>
          )}

          {/* Step 7: Description */}
          {step === 7 && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Observações</h2>
              <p className="wizard-step-subtitle">Adicione informações complementares (opcional)</p>

              <div className="form-group">
                <label className="form-label">Descrição</label>
                <textarea
                  className="form-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descreva o evento..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observações internas</label>
                <textarea
                  className="form-textarea"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Observações para a liderança..."
                />
              </div>
            </div>
          )}

          {/* Step 8: Review */}
          {step === 8 && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Revisar e Salvar</h2>
              <p className="wizard-step-subtitle">Confira as informações antes de salvar</p>

              <div className="card">
                <div className="review-grid">
                  <div className="review-section">
                    <div className="review-label">Tipo</div>
                    <div className="review-value">{getEventTypeName(eventTypeId)}</div>
                  </div>
                  <div className="review-section">
                    <div className="review-label">Título</div>
                    <div className="review-value">{title}</div>
                  </div>
                  <div className="review-section">
                    <div className="review-label">Data</div>
                    <div className="review-value">{date}</div>
                  </div>
                  <div className="review-section">
                    <div className="review-label">Horário</div>
                    <div className="review-value">
                      {startTime}{endTime && ` — ${endTime}`}
                    </div>
                  </div>
                  {locationId && (
                    <div className="review-section">
                      <div className="review-label">📍 Local</div>
                      <div className="review-value">{getLocationName(locationId)}</div>
                    </div>
                  )}
                  {ministryId && (
                    <div className="review-section">
                      <div className="review-label">🏛️ Ministério</div>
                      <div className="review-value">{getMinistryName(ministryId)}</div>
                    </div>
                  )}
                </div>

                {(responsibleId || preacherId || worshipLeaderId || soundPersonId) && (
                  <>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: 'var(--space-4) 0' }} />
                    <div className="review-grid">
                      {responsibleId && (
                        <div className="review-section">
                          <div className="review-label">👤 Responsável</div>
                          <div className="review-value">{getName(responsibleId)}</div>
                        </div>
                      )}
                      {preacherId && (
                        <div className="review-section">
                          <div className="review-label">🎤 Pregador</div>
                          <div className="review-value">{getName(preacherId)}</div>
                        </div>
                      )}
                      {worshipLeaderId && (
                        <div className="review-section">
                          <div className="review-label">🎵 Louvor</div>
                          <div className="review-value">{getName(worshipLeaderId)}</div>
                        </div>
                      )}
                      {soundPersonId && (
                        <div className="review-section">
                          <div className="review-label">🔊 Sonoplastia</div>
                          <div className="review-value">{getName(soundPersonId)}</div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {needsSound && <span className="badge badge-info">🔊 Sonoplastia</span>}
                  {needsDeaconry && <span className="badge badge-info">👔 Diaconato</span>}
                </div>
              </div>

              {locationConflicts.length > 0 && (
                <div className="conflict-alert mt-4">
                  <span className="conflict-alert-icon">⚠️</span>
                  <div>
                    <div className="conflict-alert-title">Atenção: conflito de local</div>
                    <div className="conflict-alert-message">
                      O local já possui eventos no mesmo horário. O evento será salvo mesmo assim.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="wizard-actions">
            {step > 1 ? (
              <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
                ◀ Voltar
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={() => router.push('/agenda')}>
                Cancelar
              </button>
            )}

            {step < TOTAL_STEPS ? (
              <button
                className="btn btn-primary"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
              >
                Próximo ▶
              </button>
            ) : (
              <button
                className="btn btn-success btn-lg"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2, borderTopColor: 'white' }} />
                    Salvando...
                  </>
                ) : (
                  '✅ Salvar Evento'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
