'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getLiturgyItemPublic, updateLiturgyItemPublic } from '@/app/actions';
import PersonSelect from '@/components/ui/PersonSelect';
import { formatDateLong } from '@/lib/utils/dates';

export default function LiturgyInvitePage() {
  const params = useParams();
  const itemId = params.id as string;

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [responsibleId, setResponsibleId] = useState<string>('');
  const [listSingers, setListSingers] = useState<string>('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getLiturgyItemPublic(itemId);
        setItem(data);
        if (data.responsible_person_id) {
          setResponsibleId(data.responsible_person_id);
        }
        
        let textNotes = data.notes || '';
        const isLouvorGroup = (data.title || '').toLowerCase().includes('louvor') && !(data.title || '').toLowerCase().includes('especial');
        if (textNotes.trim().startsWith('{') && textNotes.trim().endsWith('}')) {
          try {
             const parsed = JSON.parse(textNotes);
             if (parsed.singers) setListSingers(parsed.singers);
          } catch(e) {}
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar item.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [itemId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const isLouvorGroup = (item?.title || '').toLowerCase().includes('louvor') && !(item?.title || '').toLowerCase().includes('especial');
      let finalNotes = item?.notes;
      
      if (isLouvorGroup) {
         let parsed = { singers: '', songs: ['', '', ''] };
         try {
            if (item?.notes?.trim().startsWith('{')) parsed = JSON.parse(item.notes);
         } catch(e) {}
         parsed.singers = listSingers;
         finalNotes = JSON.stringify(parsed);
      }

      await updateLiturgyItemPublic(itemId, {
        responsible_person_id: responsibleId || null,
        notes: finalNotes
      });
      setSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <div className="spinner spinner-lg"></div>
    </div>;
  }

  if (error || !item) {
    return <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
      <h2 style={{ color: 'var(--error)' }}>{error || 'Item não encontrado'}</h2>
    </div>;
  }

  const isLouvorGroup = (item.title || '').toLowerCase().includes('louvor') && !(item.title || '').toLowerCase().includes('especial');
  const event = item.liturgy?.events;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <div style={{ maxWidth: 480, width: '100%', marginTop: 'var(--space-8)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: 'var(--primary)', color: 'white', fontSize: '1.5rem', marginBottom: 'var(--space-4)' }}>
            ⛪
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Definir Escala</h1>
          {event && (
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
              {event.title} • {formatDateLong(event.date)}
            </p>
          )}
        </div>

        {success ? (
          <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
             <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>✅</div>
             <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Salvo com Sucesso!</h2>
             <p style={{ color: 'var(--text-secondary)' }}>
               A escala para <strong>{item.title}</strong> foi atualizada. Você já pode fechar esta página.
             </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
              {item.title}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-6)' }}>
              Por favor, preencha as informações abaixo para confirmar sua participação ou de sua equipe.
            </p>

            <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="form-label">Responsável / Líder</label>
              <PersonSelect 
                value={responsibleId} 
                onChange={(val) => setResponsibleId(val)} 
                placeholder="Busque pelo nome..." 
              />
            </div>

            {isLouvorGroup && (
              <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
                <label className="form-label">Equipe (Cantores, Instrumentistas, etc)</label>
                <textarea 
                  className="form-input" 
                  value={listSingers} 
                  onChange={e => setListSingers(e.target.value)}
                  placeholder="Ex: Responsável: João | Equipe: Maria, José, Ana"
                  rows={3}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  Descreva quem estará ajudando neste momento de louvor.
                </div>
              </div>
            )}

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: 'var(--space-4)', padding: '12px' }}
              onClick={handleSave}
              disabled={saving || !responsibleId}
            >
              {saving ? 'Salvando...' : 'Confirmar Participação'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
