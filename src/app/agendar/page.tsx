'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { EventType } from '@/lib/types';
import { useToast } from '@/lib/hooks/useToast';

export default function PublicAgendarPage() {
  const supabase = createClient();
  const { addToast } = useToast();
  
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [eventTypeId, setEventTypeId] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchEventTypes = async () => {
      const { data } = await supabase.from('event_types').select('*').eq('is_active', true).order('sort_order');
      if (data) setEventTypes(data as EventType[]);
      if (data && data.length > 0) setEventTypeId(data[0].id);
      setLoading(false);
    };
    fetchEventTypes();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !startTime || !eventTypeId || !solicitante.trim()) {
      addToast({ type: 'error', title: 'Preencha todos os campos obrigatórios' });
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        date: date,
        start_time: startTime,
        event_type_id: eventTypeId,
        description: `Solicitado por: ${solicitante.trim()}`,
        notes: notes.trim(),
        status: 'scheduled'
      };

      const { error } = await supabase.from('events').insert(payload);
      
      if (error) throw error;
      
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
          <Link href="/" className="btn btn-primary" style={{ display: 'block', width: '100%', textDecoration: 'none' }}>
            Voltar para a Agenda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', paddingBottom: 'var(--space-8)' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: 'var(--primary)', 
        padding: 'var(--space-4)',
        color: 'white',
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)'
      }}>
        <Link href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '1.5rem' }}>←</Link>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Solicitar Agendamento</h1>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--space-4)' }}>
        <div style={{ marginBottom: 'var(--space-6)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Preencha os dados abaixo para adicionar um evento, ensaio ou reunião na agenda geral da igreja.
          </p>
        </div>

        <div className="card" style={{ padding: 'var(--space-6)' }}>
          {loading ? (
            <div className="loading-page"><div className="spinner spinner-lg" /></div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              
              <div className="form-group">
                <label className="form-label">Tipo do Evento *</label>
                <select className="form-input" value={eventTypeId} onChange={e => setEventTypeId(e.target.value)}>
                  {eventTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nome do Evento *</label>
                <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Ensaio de Jovens, Reunião do Ministério da Mulher..." />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Data *</label>
                  <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Horário de Início *</label>
                  <input type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quem está solicitando? *</label>
                <input type="text" className="form-input" value={solicitante} onChange={e => setSolicitante(e.target.value)} placeholder="Seu nome ou cargo (ex: Irmã Maria - Diaconato)" />
              </div>

              <div className="form-group">
                <label className="form-label">Observações (opcional)</label>
                <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Precisa de som? Vai usar alguma sala específica? Escreva aqui." rows={3} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-2)' }} disabled={saving}>
                {saving ? 'Salvando...' : 'Confirmar Agendamento'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
