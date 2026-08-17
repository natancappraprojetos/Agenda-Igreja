'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import SearchSelect from '@/components/ui/SearchSelect';
import { generateLiturgyTemplate } from '@/lib/liturgyTemplate';
import PersonSelect from '@/components/ui/PersonSelect';
import PersonAutocomplete from '@/components/ui/PersonAutocomplete';
import type { EventType, Location, Ministry, Person } from '@/lib/types';

import { Suspense } from 'react';
import ProtectedRoute from '@/components/ui/ProtectedRoute';

const TOTAL_STEPS = 8;

function NovoEventoWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();

  // Reference Data
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [needTypes, setNeedTypes] = useState<any[]>([]);

  // Form Data
  const [eventTypeId, setEventTypeId] = useState('');
  const [title, setTitle] = useState('');
  const searchParams = useSearchParams();
  const [date, setDate] = useState(searchParams.get('date') || '');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [locationId, setLocationId] = useState('');
  const [ministryId, setMinistryId] = useState('');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  // Culto Participants Options
  const [preacherOption, setPreacherOption] = useState<'igreja' | 'ministerio'>('igreja');
  const [worshipOption, setWorshipOption] = useState<'igreja' | 'ministerio'>('igreja');
  const [ofertasOption, setOfertasOption] = useState<'igreja' | 'ministerio'>('igreja');
  const [historiaOption, setHistoriaOption] = useState<'igreja' | 'ministerio'>('igreja');

  const [responsibleId, setResponsibleId] = useState('');
  const [preacherId, setPreacherId] = useState('');
  const [preacherName, setPreacherName] = useState('');
  const [worshipLeaderId, setWorshipLeaderId] = useState('');
  const [worshipLeaderName, setWorshipLeaderName] = useState('');
  const [soundPersonId, setSoundPersonId] = useState('');
  const [ofertasId, setOfertasId] = useState('');
  const [ofertasName, setOfertasName] = useState('');
  const [historiaId, setHistoriaId] = useState('');
  const [historiaName, setHistoriaName] = useState('');
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');

  const [parentEventId, setParentEventId] = useState('');
  const [existingCultos, setExistingCultos] = useState<Array<any>>([]);

  // Conflicts
  const [locationConflicts, setLocationConflicts] = useState<Array<any>>([]);
  const [personConflicts, setPersonConflicts] = useState<Array<any>>([]);

  const fetchReferenceData = useCallback(async () => {
    setLoading(true);
    const [types, locs, mins, needsData, ppl] = await Promise.all([
      supabase.from('event_types').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('locations').select('*').eq('is_active', true).order('name'),
      supabase.from('ministries').select('*').eq('is_active', true).order('name'),
      supabase.from('event_needs_types').select('*').eq('is_active', true).order('name'),
      supabase.from('people').select('*').eq('is_active', true).order('name')
    ]);
    if (types.data) setEventTypes(types.data as EventType[]);
    if (locs.data) setLocations(locs.data as Location[]);
    if (mins.data) setMinistries(mins.data as Ministry[]);
    if (needsData.data) setNeedTypes(needsData.data);
    if (ppl.data) setPeople(ppl.data as Person[]);
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

  const isCulto = !!eventTypes.find(t => t.id === eventTypeId)?.name.toLowerCase().match(/culto|jovem|desbravador|batismo|especial|sabatina/);

  useEffect(() => {
    if (isCulto && locations.length > 0 && !locationId) {
      const nave = locations.find(l => l.name.toLowerCase().includes('nave'));
      if (nave) setLocationId(nave.id);
    }
  }, [isCulto, locations, locationId]);

  // Check existing cultos to link sub-events
  const checkExistingCultos = useCallback(async () => {
    if (!date) return;
    const cultoTypes = eventTypes.filter(t => t.name.toLowerCase().match(/culto|sabatina|jovem/)).map(t => t.id);
    if (cultoTypes.length === 0) return;

    const { data } = await supabase
      .from('events')
      .select('id, title, start_time')
      .in('event_type_id', cultoTypes)
      .eq('date', date)
      .in('status', ['scheduled', 'confirmed'])
      .order('start_time');
    setExistingCultos(data || []);
  }, [date, eventTypes, supabase]);

  useEffect(() => { checkExistingCultos(); }, [checkExistingCultos]);

  const canProceed = () => {
    switch (step) {
      case 1: return !!eventTypeId;
      case 2: return !!date && !!startTime && !!title;
      case 3: return locationConflicts.length === 0; // location optional but blocks if conflict
      case 4: return true; // ministry is optional
      case 5: return true; // people are optional
      case 6: return true; // needs are optional
      case 7: return true; // description is optional
      case 8: return true; // review
      default: return false;
    }
  };

  const getStepsPath = () => {
     const path = [1];
     if (isCulto) path.push(1.5);
     path.push(2);
     if (!parentEventId && !isCulto) path.push(3); // Skip location if linked or if Culto
     path.push(4); // Ministry
     if (!parentEventId) path.push(5); // Skip participants questionnaire if linked
     if (!parentEventId) path.push(6); // Skip needs if linked
     path.push(7);
     path.push(8);
     return path;
  };

  const goToNextStep = () => {
    const path = getStepsPath();
    const currentIndex = path.indexOf(step);
    if (currentIndex >= 0 && currentIndex < path.length - 1) {
      setStep(path[currentIndex + 1]);
    }
  };

  const goToPrevStep = () => {
    const path = getStepsPath();
    const currentIndex = path.indexOf(step);
    if (currentIndex > 0) {
      setStep(path[currentIndex - 1]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalNotes = notes.trim();
      
      if (isCulto && ministryId) {
         const responsabilidades = [];
         
         if (preacherOption === 'ministerio') {
            responsabilidades.push(`- Pregação: Nosso ministério fará`);
         } else if (preacherOption === 'igreja' && preacherName && !preacherId) {
            responsabilidades.push(`- Pregação: ${preacherName}`);
         }
         
         if (worshipOption === 'ministerio') {
            responsabilidades.push(`- Louvor: Nosso ministério fará`);
         } else if (worshipOption === 'igreja' && worshipLeaderName && !worshipLeaderId) {
            responsabilidades.push(`- Louvor: ${worshipLeaderName}`);
         }
         
         if (ofertasOption === 'ministerio') {
            responsabilidades.push(`- Ofertas: Nosso ministério fará`);
         } else if (ofertasOption === 'igreja' && ofertasName && !ofertasId) {
            responsabilidades.push(`- Ofertas: ${ofertasName}`);
         }
         
         if (historiaOption === 'ministerio') {
            responsabilidades.push(`- História: Nosso ministério fará`);
         } else if (historiaOption === 'igreja' && historiaName && !historiaId) {
            responsabilidades.push(`- História: ${historiaName}`);
         }
         
         if (responsabilidades.length > 0) {
            finalNotes += (finalNotes ? '\n\n' : '') + `Detalhes da Programação:\n${responsabilidades.join('\n')}`;
         }
      }

      const payload = {
        title: title.trim(),
        event_type_id: eventTypeId,
        parent_event_id: parentEventId || null,
        date: date,
        start_time: startTime,
        end_time: endTime || null,
        location_id: locationId || null,
        ministry_id: ministryId || null,
        preacher_id: preacherId || null,
        worship_leader_id: worshipLeaderId || null,
        sound_person_id: soundPersonId || null,
        responsible_person_id: responsibleId || null,
        notes: finalNotes || null,
        description: description.trim() || null,
        needs_sound: isCulto,
        needs_worship: isCulto,
        needs_deaconry: isCulto,
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

      // Create schedule entries for assigned people
      const scheduleEntries = [];
      if (preacherId) scheduleEntries.push({ event_id: insertedEvent.id, person_id: preacherId, date, start_time: startTime, end_time: endTime || null });
      if (worshipLeaderId) scheduleEntries.push({ event_id: insertedEvent.id, person_id: worshipLeaderId, date, start_time: startTime, end_time: endTime || null });
      if (soundPersonId) scheduleEntries.push({ event_id: insertedEvent.id, person_id: soundPersonId, date, start_time: startTime, end_time: endTime || null });
      if (responsibleId) scheduleEntries.push({ event_id: insertedEvent.id, person_id: responsibleId, date, start_time: startTime, end_time: endTime || null });

      if (scheduleEntries.length > 0) {
        await supabase.from('schedules').insert(scheduleEntries);
      }

      if (ofertasId || historiaId) {
        const rolesData = await supabase.from('roles').select('id, name').in('name', ['Ofertas', 'História das Crianças']);
        const epPayload = [];
        if (ofertasId && rolesData.data) {
           const r = rolesData.data.find(r => r.name === 'Ofertas');
           if (r) epPayload.push({ event_id: insertedEvent.id, role_id: r.id, person_id: ofertasId });
        }
        if (historiaId && rolesData.data) {
           const r = rolesData.data.find(r => r.name === 'História das Crianças');
           if (r) epPayload.push({ event_id: insertedEvent.id, role_id: r.id, person_id: historiaId });
        }
        if (epPayload.length > 0) await supabase.from('event_participants').insert(epPayload);
      }

      addToast({ type: 'success', title: 'Evento criado!', message: `${title} foi adicionado à agenda.` });
      router.push(`/eventos/${insertedEvent.id}`);
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
                    onClick={() => {
                      setEventTypeId(type.id);
                      // If it's a Culto, go to step 1.5 to pick the specific Culto
                      if (type.name.toLowerCase().includes('culto')) {
                        setTimeout(() => setStep(1.5), 200);
                      } else {
                        setTimeout(() => setStep(2), 200);
                      }
                    }}
                  >
                    <span className="wizard-option-icon">{type.icon}</span>
                    <span className="wizard-option-label">{type.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1.5: Subtipo de Culto */}
          {step === 1.5 && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Qual Culto?</h2>
              <p className="wizard-step-subtitle">Selecione o culto específico</p>
              <div className="wizard-options">
                {[
                  { id: 'sabado', name: 'Culto de Sábado', start: '09:00', end: '11:30' },
                  { id: 'domingo', name: 'Culto de Domingo', start: '19:30', end: '20:30' },
                  { id: 'quarta', name: 'Culto de Quarta', start: '19:30', end: '20:30' },
                  { id: 'evangelismo', name: 'Culto Evangelístico', start: '19:30', end: '20:30' },
                  { id: 'jovem', name: 'Culto Jovem', start: '16:00', end: '17:30' },
                  { id: 'outro', name: 'Outro Culto', start: '19:30', end: '' }
                ].filter(ct => {
                  if (!date) return true;
                  const d = new Date(date + 'T00:00:00');
                  const day = d.getDay();
                  if (day === 6) return ct.id !== 'quarta' && ct.id !== 'domingo';
                  if (day === 3) return ct.id !== 'sabado' && ct.id !== 'domingo' && ct.id !== 'jovem';
                  if (day === 0) return ct.id !== 'sabado' && ct.id !== 'quarta';
                  return true;
                }).map(ct => (
                  <div
                    key={ct.id}
                    className="wizard-option"
                    onClick={() => {
                      setTitle(ct.name === 'Outro Culto' ? 'Culto' : ct.name);
                      setStartTime(ct.start);
                      setEndTime(ct.end);
                      setTimeout(() => setStep(2), 200);
                    }}
                  >
                    <span className="wizard-option-icon">⛪</span>
                    <span className="wizard-option-label">{ct.name}</span>
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
                  <label className="form-label">Horário de Início *</label>
                  <input type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Horário de Fim (Opcional)</label>
                  <input type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
                
                {!isCulto && existingCultos.length > 0 && (
                  <div className="alert bg-blue-50 border-blue-200" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-color)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-color)', marginBottom: 'var(--space-2)' }}>Vincular ao Culto?</h3>
                    <p style={{ fontSize: '0.875rem', marginBottom: 'var(--space-3)' }}>Identificamos que haverá culto neste dia. Deseja que este evento (ex: Batismo, Comissão) seja parte da programação do culto?</p>
                    {existingCultos.map(culto => (
                      <label key={culto.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', fontSize: '0.9rem', cursor: 'pointer' }}>
                        <input type="radio" name="parentCulto" checked={parentEventId === culto.id} onChange={() => setParentEventId(culto.id)} />
                        Sim, vincular ao {culto.title} ({culto.start_time.slice(0, 5)})
                      </label>
                    ))}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input type="radio" name="parentCulto" checked={parentEventId === ''} onChange={() => setParentEventId('')} />
                      Não, este é um evento separado
                    </label>
                  </div>
                )}
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
                    <div className="conflict-alert-title">Já existe um evento agendado neste local e horário:</div>
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

          {/* Step 5: People */}
          {step === 5 && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Quem vai participar?</h2>
              <p className="wizard-step-subtitle">Defina os responsáveis pelo evento</p>

              <div className="form-group">
                <label className="form-label">👤 Responsável Principal</label>
                <PersonSelect
                  value={responsibleId}
                  onChange={val => setResponsibleId(val || '')}
                  placeholder="Buscar ou cadastrar..."
                />
              </div>

              {isCulto ? (
                ministryId ? (
                  <div style={{ marginTop: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-2)' }}>Detalhes da Programação do Ministério</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>Como o ministério vai organizar as partes do culto?</p>
                    
                    <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                      <label className="form-label">🎤 Pregação</label>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <button className={`btn ${preacherOption === 'ministerio' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setPreacherOption('ministerio'); setPreacherId(''); setPreacherName(''); }}>Nosso Ministério fará</button>
                        <button className={`btn ${preacherOption === 'igreja' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setPreacherOption('igreja'); setPreacherId(''); setPreacherName(''); }}>Liderança da Igreja define</button>
                      </div>
                      {preacherOption === 'igreja' && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                          <PersonAutocomplete onSelect={(person, name) => { setPreacherId(person?.id || ''); setPreacherName(person?.name || name); }} placeholder="Nome (opcional)" />
                        </div>
                      )}
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                      <label className="form-label">🎵 Música / Louvor</label>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <button className={`btn ${worshipOption === 'ministerio' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setWorshipOption('ministerio'); setWorshipLeaderId(''); setWorshipLeaderName(''); }}>Nosso Ministério fará</button>
                        <button className={`btn ${worshipOption === 'igreja' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setWorshipOption('igreja'); setWorshipLeaderId(''); setWorshipLeaderName(''); }}>Equipe de Música Oficial</button>
                      </div>
                      {worshipOption === 'igreja' && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                          <PersonAutocomplete onSelect={(person, name) => { setWorshipLeaderId(person?.id || ''); setWorshipLeaderName(person?.name || name); }} placeholder="Nome (opcional)" />
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                      <label className="form-label">💰 Dízimos e Ofertas</label>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <button className={`btn ${ofertasOption === 'ministerio' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setOfertasOption('ministerio'); setOfertasId(''); setOfertasName(''); }}>Nosso Ministério fará</button>
                        <button className={`btn ${ofertasOption === 'igreja' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setOfertasOption('igreja'); setOfertasId(''); setOfertasName(''); }}>Diaconato Oficial fará</button>
                      </div>
                      {ofertasOption === 'igreja' && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                          <PersonAutocomplete onSelect={(person, name) => { setOfertasId(person?.id || ''); setOfertasName(person?.name || name); }} placeholder="Nome (opcional)" />
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                      <label className="form-label">🧸 História das Crianças</label>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <button className={`btn ${historiaOption === 'ministerio' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setHistoriaOption('ministerio'); setHistoriaId(''); setHistoriaName(''); }}>Nosso Ministério fará</button>
                        <button className={`btn ${historiaOption === 'igreja' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setHistoriaOption('igreja'); setHistoriaId(''); setHistoriaName(''); }}>Ministério da Criança Oficial</button>
                      </div>
                      {historiaOption === 'igreja' && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                          <PersonAutocomplete onSelect={(person, name) => { setHistoriaId(person?.id || ''); setHistoriaName(person?.name || name); }} placeholder="Nome (opcional)" />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">🎤 Pregador</label>
                      <PersonSelect
                        value={preacherId}
                        onChange={val => setPreacherId(val || '')}
                        placeholder="Buscar ou cadastrar..."
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">🎵 Música / Louvor</label>
                      <PersonSelect
                        value={worshipLeaderId}
                        onChange={val => setWorshipLeaderId(val || '')}
                        placeholder="Buscar ou cadastrar..."
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">💰 Dízimos e Ofertas</label>
                      <PersonSelect
                        value={ofertasId}
                        onChange={val => setOfertasId(val || '')}
                        placeholder="Buscar ou cadastrar..."
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">🧸 História das Crianças</label>
                      <PersonSelect
                        value={historiaId}
                        onChange={val => setHistoriaId(val || '')}
                        placeholder="Buscar ou cadastrar..."
                      />
                    </div>
                  </>
                )
              ) : null}
            </div>
          )}

          {/* Step 6: Needs */}
          {step === 6 && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Necessidades do evento</h2>
              <p className="wizard-step-subtitle">Configure o que o evento precisa</p>

              {needTypes.filter(need => {
                if (isCulto && (need.name.toLowerCase().includes('sonoplastia') || need.name.toLowerCase().includes('louvor') || need.name.toLowerCase().includes('música') || need.name.toLowerCase().includes('diaconato'))) {
                  return false;
                }
                return true;
              }).map(need => (
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
                  {selectedNeeds.map(needId => {
                    const need = needTypes.find(n => n.id === needId);
                    return need ? <span key={need.id} className="badge badge-info">{need.icon} {need.name}</span> : null;
                  })}
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
              <button className="btn btn-secondary" onClick={goToPrevStep}>
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
                onClick={goToNextStep}
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

export default function NovoEventoPage() {
  return (
    <ProtectedRoute requireLeadership>
      <Suspense fallback={<div className="loading-page"><div className="spinner spinner-lg" /></div>}>
        <NovoEventoWizard />
      </Suspense>
    </ProtectedRoute>
  );
}
