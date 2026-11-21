'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getLiturgyItemPublic, updateLiturgyItemPublic } from '@/app/actions';
import { formatDateLong } from '@/lib/utils/dates';
import { formatTime } from '@/lib/utils/liturgy-calculator';

function isCongregationalPraise(title: string): boolean {
  const t = (title || '').toLowerCase();
  return t.includes('congregaciona') || t.includes('momento de louvor') || t.includes('cânticos') || t.includes('canticos');
}

function isMusicalItem(title: string): boolean {
  const t = (title || '').toLowerCase();
  return isCongregationalPraise(t) || 
         t.includes('louvor') || 
         t.includes('cântico') || 
         t.includes('cantico') || 
         t.includes('música') || 
         t.includes('musica') || 
         t.includes('hino') || 
         t.includes('solo');
}

function isOfferingItem(title: string): boolean {
  const t = (title || '').toLowerCase();
  return t.includes('oferta') || t.includes('provai') || t.includes('fidelidade') || t.includes('dízimo') || t.includes('dizimo');
}

function isSaturdayEvent(eventDate?: string, eventTitle?: string): boolean {
  if (eventDate) {
    const d = new Date(eventDate.includes('T') ? eventDate : eventDate + 'T00:00:00');
    if (!isNaN(d.getTime()) && d.getDay() === 6) return true;
  }
  const t = (eventTitle || '').toLowerCase();
  return t.includes('sábado') || t.includes('sabado');
}

function PersonInputField({
  label,
  value,
  onChange,
  people,
  placeholder,
  helperText
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  people: { id: string; name: string }[];
  placeholder?: string;
  helperText?: string;
}) {
  const [showDrop, setShowDrop] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = people.filter(p => 
    p.name.toLowerCase().includes(value.toLowerCase().trim())
  );

  return (
    <div style={{ marginBottom: '16px', position: 'relative' }} ref={ref}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowDrop(true);
          }}
          onFocus={() => setShowDrop(true)}
          placeholder={placeholder || 'Digite o nome ou busque na igreja...'}
          style={{
            flex: 1,
            padding: '12px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.95rem',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setShowDrop(false); }}
            style={{
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#64748b',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
            title="Limpar"
          >
            ✖
          </button>
        )}
      </div>
      {helperText && (
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
          {helperText}
        </div>
      )}

      {showDrop && value.trim().length > 0 && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          marginTop: '4px',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
          maxHeight: '180px',
          overflowY: 'auto',
          zIndex: 60
        }}>
          <div style={{ padding: '6px 12px', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase' }}>
            Membros da Igreja Santo Afonso (clique para selecionar)
          </div>
          {filtered.slice(0, 8).map((p) => (
            <div
              key={p.id}
              onClick={() => { onChange(p.name); setShowDrop(false); }}
              style={{
                padding: '10px 12px',
                fontSize: '0.9rem',
                color: '#1e293b',
                cursor: 'pointer',
                borderBottom: '1px solid #f8fafc'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              {p.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LiturgyInvitePage() {
  const params = useParams();
  const itemId = params.id as string;

  const [item, setItem] = useState<any>(null);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modos de exibição
  const [isListMode, setIsListMode] = useState(false);
  const [isOfferingMode, setIsOfferingMode] = useState(false);

  // Louvor Congregacional
  const [listSongs, setListSongs] = useState<string[]>(['', '', '']);
  const [teamSingers, setTeamSingers] = useState('');

  // Ofertas (Provai e Vede)
  const [diacono1, setDiacono1] = useState('');
  const [diacono2, setDiacono2] = useState('');
  const [oracao, setOracao] = useState('');

  // Item Individual (Solo ou Geral)
  const [personName, setPersonName] = useState('');
  const [songTitle, setSongTitle] = useState('');

  // Observações (agora com botão expansível)
  const [customNotes, setCustomNotes] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await getLiturgyItemPublic(itemId);
        setItem(res.item);
        setPeople(res.people || []);

        const rawNotes = res.item.notes || '';
        let detectedList = isCongregationalPraise(res.item.title);
        let detectedOffering = isOfferingItem(res.item.title);

        let initialSingers = '';
        let initialSongs: string[] = ['', '', ''];
        let initialD1 = '';
        let initialD2 = '';
        let initialOracao = '';
        let initialObs = '';

        if (rawNotes.trim().startsWith('{') && rawNotes.trim().endsWith('}')) {
          try {
            const parsed = JSON.parse(rawNotes);
            if (parsed.songs && Array.isArray(parsed.songs)) {
              detectedList = true;
              initialSingers = parsed.singers || '';
              initialSongs = parsed.songs.length > 0 ? parsed.songs : ['', '', ''];
            } else if (parsed.type === 'offering' || parsed.diacono1 !== undefined || parsed.oracao !== undefined) {
              detectedOffering = true;
              initialD1 = parsed.diacono1 || '';
              initialD2 = parsed.diacono2 || '';
              initialOracao = parsed.oracao || '';
              initialObs = parsed.obs || '';
            } else if (parsed.singers) {
              initialSingers = parsed.singers;
            }
          } catch (e) {
            initialObs = rawNotes;
          }
        } else {
          initialObs = rawNotes;
        }

        if (detectedList && !initialSingers && res.item.responsible_person?.name) {
          initialSingers = `Responsável: ${res.item.responsible_person.name}`;
        }

        if (detectedOffering && !initialD1 && res.item.responsible_person?.name) {
          initialD1 = res.item.responsible_person.name;
        }

        while (initialSongs.length < 3) {
          initialSongs.push('');
        }

        setIsListMode(detectedList);
        setIsOfferingMode(detectedOffering);

        setTeamSingers(initialSingers);
        setListSongs(initialSongs);

        setDiacono1(initialD1);
        setDiacono2(initialD2);
        setOracao(initialOracao);

        setPersonName(res.item.responsible_person?.name || '');
        setCustomNotes(initialObs);
        if (initialObs.trim()) {
          setShowNotesField(true);
        }
      } catch (err: any) {
        console.error('Error loading invite:', err);
        setError(err.message || 'Item não encontrado ou link expirado.');
      } finally {
        setLoading(false);
      }
    }

    if (itemId) {
      load();
    }
  }, [itemId]);

  const handleUpdateSong = (idx: number, val: string) => {
    const updated = [...listSongs];
    updated[idx] = val;
    setListSongs(updated);
  };

  const handleAddSong = () => {
    setListSongs([...listSongs, '']);
  };

  const handleRemoveSong = (idx: number) => {
    if (listSongs.length <= 1) {
      setListSongs(['']);
      return;
    }
    const updated = [...listSongs];
    updated.splice(idx, 1);
    setListSongs(updated);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const isSaturday = isSaturdayEvent(item?.liturgy?.events?.date, item?.liturgy?.events?.title);

      if (isOfferingMode) {
        // Ofertas / Provai e Vede
        if (isSaturday) {
          if (!diacono1.trim() && !diacono2.trim() && !oracao.trim()) {
            alert('Por favor, informe pelo menos uma pessoa para a escala de ofertas.');
            setSaving(false);
            return;
          }
        } else {
          if (!diacono1.trim() && !oracao.trim()) {
            alert('Por favor, informe quem fará o recolhimento das ofertas ou a oração.');
            setSaving(false);
            return;
          }
        }

        await updateLiturgyItemPublic(itemId, {
          offering_data: {
            diacono1: diacono1.trim(),
            diacono2: diacono2.trim(),
            oracao: oracao.trim()
          },
          notes: customNotes.trim() || null
        });
      } else if (isListMode) {
        // Louvores Congregacionais
        const validSongs = listSongs.map(s => s.trim());
        const finalSingers = teamSingers.trim() || 'Equipe de Louvor';

        await updateLiturgyItemPublic(itemId, {
          singers: finalSingers,
          songs: validSongs,
          notes: customNotes.trim() || null
        });
      } else {
        // Itens individuais
        if (!personName.trim()) {
          alert('Por favor, informe seu nome ou selecione uma pessoa.');
          setSaving(false);
          return;
        }

        const isMusical = isMusicalItem(item?.title || '');
        const payload: any = {
          custom_name: personName.trim(),
          notes: customNotes.trim() || null
        };

        if (isMusical && songTitle.trim()) {
          payload.notes = songTitle.trim() + (customNotes.trim() ? ` (${customNotes.trim()})` : '');
        }

        await updateLiturgyItemPublic(itemId, payload);
      }
      setSuccess(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg, #f8fafc)', padding: '20px' }}>
        <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
        <p style={{ color: '#64748b', fontWeight: 600 }}>Carregando dados da liturgia...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg, #f8fafc)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div style={{ maxWidth: '420px', width: '100%', background: '#ffffff', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Link Não Encontrado</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
            {error || 'Não foi possível encontrar este item de liturgia. Verifique com a coordenação do culto se o link ainda é válido.'}
          </p>
        </div>
      </div>
    );
  }

  const event = item.liturgy?.events;
  const isSaturday = isSaturdayEvent(event?.date, event?.title);
  const isMusical = isMusicalItem(item.title);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 60px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Container Central */}
      <div style={{ maxWidth: '500px', width: '100%' }}>
        
        {/* Cabeçalho da Igreja */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#4f46e5', color: 'white', fontSize: '1.6rem', marginBottom: '12px', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}>
            ⛪
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>Central Santo Afonso</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, fontWeight: 500 }}>Confirmação de Participação na Liturgia</p>
        </div>

        {success ? (
          /* Card de Sucesso */
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '36px 24px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '32px', backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '2rem', marginBottom: '16px' }}>
              ✓
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              {isOfferingMode ? 'Escala de Ofertas Confirmada!' : (isListMode ? 'Hinos Confirmados com Sucesso!' : 'Participação Confirmada!')}
            </h2>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '20px' }}>
              {isOfferingMode ? (
                <>Muito obrigado! A escala para <strong>{item.title}</strong> foi atualizada e já está sincronizada na agenda do <strong>{event?.title || 'Culto'}</strong>.</>
              ) : isListMode ? (
                <>Muito obrigado! Os hinos para o <strong>Louvor Congregacional</strong> foram atualizados e já estão na programação do <strong>{event?.title || 'Culto'}</strong>.</>
              ) : (
                <>Muito obrigado! O responsável por <strong>{item.title}</strong> foi registrado com sucesso na agenda do <strong>{event?.title || 'Culto'}</strong>.</>
              )}
            </p>
            
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Resumo da escala</div>
              
              {isOfferingMode ? (
                <div style={{ fontSize: '0.9rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {diacono1 && <div><strong>Diácono 1:</strong> {diacono1}</div>}
                  {diacono2 && <div><strong>Diácono 2:</strong> {diacono2}</div>}
                  {oracao && <div><strong>Oração:</strong> {oracao}</div>}
                </div>
              ) : isListMode ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b', marginBottom: '8px' }}>
                    🎤 {teamSingers || 'Equipe de Louvor'}
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {listSongs.filter(s => s && s.trim()).map((s, idx) => (
                      <div key={idx} style={{ padding: '3px 0' }}>
                        <span style={{ fontWeight: 700, color: '#4f46e5' }}>Hino {idx + 1}:</span> {s}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>👤 {personName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>📌 {item.title}</div>
                  {songTitle && <div style={{ fontSize: '0.85rem', color: '#4f46e5', marginTop: '4px' }}>🎵 {songTitle}</div>}
                </>
              )}

              {customNotes && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', fontStyle: 'italic' }}>💬 "{customNotes}"</div>}
            </div>

            <button 
              type="button" 
              onClick={() => setSuccess(false)}
              style={{ background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            >
              ✏️ Alterar Resposta
            </button>
          </div>
        ) : (
          /* Formulário de Preenchimento */
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            
            {/* Bloco de Destaque do Evento e Item */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                {event?.title || 'Culto da Igreja'}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600, marginBottom: '10px' }}>
                📅 {event?.date ? formatDateLong(event.date) : ''}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>PARTE DA LITURGIA:</span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{item.title}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {item.calculated_time && (
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#4f46e5', display: 'block' }}>
                      {formatTime(item.calculated_time)}
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.duration_minutes} min</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave}>

              {/* CENÁRIO 1: OFERTAS / PROVAI E VEDE */}
              {isOfferingMode ? (
                <>
                  <div style={{ marginBottom: '16px', background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', marginBottom: '2px' }}>
                      💰 Escala de Dízimos e Ofertas ({isSaturday ? 'Sábado' : 'Culto Regular'}):
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                      {isSaturday 
                        ? 'No sábado, escalam-se 2 diáconos para recolher e 1 pessoa para fazer a oração.' 
                        : 'No domingo/quarta, 1 ou 2 pessoas fazem o recolhimento e a oração.'}
                    </div>
                  </div>

                  {/* Diácono 1 */}
                  <PersonInputField
                    label={isSaturday ? '1. Diácono 1 (Recolher ofertas):' : '1. Diácono / Responsável (Recolher ofertas):'}
                    value={diacono1}
                    onChange={setDiacono1}
                    people={people}
                    placeholder="Digite o nome ou busque na igreja..."
                  />

                  {/* Diácono 2 */}
                  <PersonInputField
                    label={isSaturday ? '2. Diácono 2 (Recolher ofertas):' : '2. Diácono 2 (Opcional):'}
                    value={diacono2}
                    onChange={setDiacono2}
                    people={people}
                    placeholder={isSaturday ? 'Digite o nome do segundo diácono...' : 'Opcional (se houver segundo diácono)...'}
                  />

                  {/* Oração das Ofertas */}
                  <PersonInputField
                    label={isSaturday ? '3. Oração das Ofertas (Orador da oração):' : 'Oração das Ofertas (Opcional):'}
                    value={oracao}
                    onChange={setOracao}
                    people={people}
                    placeholder={isSaturday ? 'Quem fará a oração das ofertas...' : 'Deixe em branco se for o próprio diácono...'}
                  />
                </>
              ) : isListMode ? (
                /* CENÁRIO 2: LOUVORES CONGREGACIONAIS */
                <>
                  {/* Cantores / Equipe que vai puxar */}
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      🎤 Cantores (Equipe que vai puxar os hinos):
                    </label>
                    <input
                      type="text"
                      value={teamSingers}
                      onChange={(e) => setTeamSingers(e.target.value)}
                      placeholder="Ex: Responsável: Maria Eduarda | Equipe: Lucas, Ana"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.95rem',
                        boxSizing: 'border-box',
                        fontWeight: 600,
                        color: '#1e293b',
                        backgroundColor: '#ffffff'
                      }}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      O responsável já está definido. Você pode adicionar outros cantores que estarão com você se desejar.
                    </div>
                  </div>

                  {/* Lista dos Hinos */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                        🎼 Hinos (normalmente 2 a 3 hinos):
                      </label>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                        {listSongs.filter(s => s && s.trim()).length} hino(s) informado(s)
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {listSongs.map((song, sIdx) => (
                        <div key={sIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ width: '60px', fontSize: '0.82rem', fontWeight: 700, color: '#4f46e5', flexShrink: 0 }}>
                            Hino {sIdx + 1}:
                          </div>
                          <input
                            type="text"
                            value={song}
                            onChange={(e) => handleUpdateSong(sIdx, e.target.value)}
                            placeholder={`Ex: Vem Espírito Santo - 585 NHA`}
                            style={{
                              flex: 1,
                              padding: '11px 13px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.92rem',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          {listSongs.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSong(sIdx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '1rem',
                                padding: '6px 8px',
                                cursor: 'pointer'
                              }}
                              title="Remover este hino"
                            >
                              ✖
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddSong}
                      style={{
                        marginTop: '10px',
                        background: 'none',
                        border: '1px dashed #4f46e5',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#4f46e5',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      + Adicionar Hino
                    </button>
                  </div>
                </>
              ) : (
                /* CENÁRIO 3: ITENS INDIVIDUAIS (História das Crianças, Solo, Pregação, etc.) */
                <>
                  <PersonInputField
                    label={isMusical ? '👤 Nome do Cantor(a) ou Grupo:' : '👤 Quem vai fazer esta parte? (Seu Nome):'}
                    value={personName}
                    onChange={setPersonName}
                    people={people}
                    placeholder="Digite seu nome ou busque na igreja..."
                  />

                  {/* Se for solo/especial: título da música */}
                  {isMusical && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        🎵 Título da Música ou Hino Especial (opcional):
                      </label>
                      <input
                        type="text"
                        value={songTitle}
                        onChange={(e) => setSongTitle(e.target.value)}
                        placeholder="Ex: Tua Graça Me Basta / Hino 350"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.9rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {/* CAMPO DE OBSERVAÇÕES: BOTÃO EXPANSÍVEL (GERAL) */}
              <div style={{ marginTop: '12px', marginBottom: '24px' }}>
                {showNotesField ? (
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                        💬 Observações ou pedido especial (opcional):
                      </label>
                      {!customNotes.trim() && (
                        <button 
                          type="button" 
                          onClick={() => setShowNotesField(false)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          Ocultar
                        </button>
                      )}
                    </div>
                    <textarea
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="Ex: Preciso de microfone sem fio / Tema: A Arca de Noé"
                      rows={2}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNotesField(true)}
                    style={{
                      background: 'none',
                      border: '1px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                      justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}
                  >
                    💬 Tem alguma observação ou pedido especial? (Opcional)
                  </button>
                )}
              </div>

              {/* Botão de Envio Principal */}
              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '1rem',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                  transition: 'background 0.2s'
                }}
              >
                {saving ? 'Salvando...' : (
                  isOfferingMode ? '✅ Confirmar Escala de Ofertas' :
                  isListMode ? '✅ Salvar Hinos e Confirmar' :
                  '✅ Confirmar Participação'
                )}
              </button>
            </form>

          </div>
        )}

        {/* Rodapé sutil */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.8rem', color: '#94a3b8' }}>
          Igreja Adventista do Sétimo Dia — Santo Afonso
        </div>

      </div>

    </div>
  );
}
