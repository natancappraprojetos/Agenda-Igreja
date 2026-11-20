'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getLiturgyItemPublic, updateLiturgyItemPublic } from '@/app/actions';
import { formatDateLong } from '@/lib/utils/dates';
import { formatTime } from '@/lib/utils/liturgy-calculator';

function isMusicalItem(title: string): boolean {
  const t = (title || '').toLowerCase();
  return t.includes('louvor') || 
         t.includes('cântico') || 
         t.includes('cantico') || 
         t.includes('música') || 
         t.includes('musica') || 
         t.includes('hino') || 
         t.includes('solo');
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

  // Form state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [teamSingers, setTeamSingers] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await getLiturgyItemPublic(itemId);
        setItem(res.item);
        setPeople(res.people || []);

        if (res.item.responsible_person) {
          setSelectedPerson(res.item.responsible_person);
          setSearchTerm(res.item.responsible_person.name);
        }

        const rawNotes = res.item.notes || '';
        if (rawNotes.trim().startsWith('{') && rawNotes.trim().endsWith('}')) {
          try {
            const parsed = JSON.parse(rawNotes);
            if (parsed.singers) setTeamSingers(parsed.singers);
            if (parsed.songs && parsed.songs.length > 0) {
              setSongTitle(parsed.songs.filter(Boolean).join(' / '));
            }
          } catch (e) {
            setCustomNotes(rawNotes);
          }
        } else {
          setCustomNotes(rawNotes);
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

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPeople = people.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleSelectPerson = (person: { id: string; name: string }) => {
    setSelectedPerson(person);
    setSearchTerm(person.name);
    setShowDropdown(false);
  };

  const handleClearPerson = () => {
    setSelectedPerson(null);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim() && !selectedPerson) {
      alert('Por favor, informe seu nome ou selecione uma pessoa.');
      return;
    }

    setSaving(true);
    try {
      const isMusical = isMusicalItem(item?.title || '');
      
      const payload: any = {
        responsible_person_id: selectedPerson ? selectedPerson.id : null,
        custom_name: !selectedPerson ? searchTerm.trim() : null,
        notes: customNotes.trim() || null
      };

      if (isMusical) {
        if (teamSingers.trim()) payload.singers = teamSingers.trim();
        if (songTitle.trim()) {
          payload.songs = songTitle.split('/').map(s => s.trim()).filter(Boolean);
        }
      }

      await updateLiturgyItemPublic(itemId, payload);
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
              Participação Confirmada!
            </h2>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Muito obrigado! O responsável por <strong>{item.title}</strong> foi registrado com sucesso na agenda do <strong>{event?.title || 'Culto'}</strong>.
            </p>
            
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Resumo da escala</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>👤 {selectedPerson?.name || searchTerm}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>📌 {item.title}</div>
              {songTitle && <div style={{ fontSize: '0.85rem', color: '#4f46e5', marginTop: '4px' }}>🎵 {songTitle}</div>}
              {customNotes && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>💬 "{customNotes}"</div>}
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
              {/* Campo de Responsável / Nome */}
              <div style={{ marginBottom: '16px', position: 'relative' }} ref={dropdownRef}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  {isMusical ? '👤 Nome do Cantor(a) ou Grupo:' : '👤 Quem vai fazer esta parte? (Seu Nome):'}
                </label>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSelectedPerson(null);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Digite seu nome ou busque na igreja..."
                    style={{
                      flex: 1,
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.95rem',
                      outline: 'none',
                      backgroundColor: selectedPerson ? '#f0fdf4' : '#ffffff',
                      borderColor: selectedPerson ? '#86efac' : '#cbd5e1'
                    }}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={handleClearPerson}
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

                {/* Status indicator abaixo do input */}
                {selectedPerson ? (
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
                    ✅ Membro vinculado: {selectedPerson.name}
                  </div>
                ) : searchTerm.trim() ? (
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '4px' }}>
                    ✍️ Será registrado como: <strong>{searchTerm.trim()}</strong>
                  </div>
                ) : null}

                {/* Dropdown de Sugestões de Membros da Igreja */}
                {showDropdown && searchTerm.trim().length > 0 && filteredPeople.length > 0 && (
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
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 50
                  }}>
                    <div style={{ padding: '6px 12px', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase' }}>
                      Membros da Igreja Santo Afonso (clique se for você)
                    </div>
                    {filteredPeople.slice(0, 10).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPerson(p)}
                        style={{
                          padding: '10px 12px',
                          fontSize: '0.9rem',
                          color: '#1e293b',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f8fafc',
                          transition: 'background 0.15s'
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

              {/* Se for item musical: música e equipe */}
              {isMusical && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      🎵 Título do Hino ou Música (opcional):
                    </label>
                    <input
                      type="text"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      placeholder="Ex: Hino 585 ou Tua Graça Me Basta"
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

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      👥 Outros cantores ou equipe (opcional):
                    </label>
                    <input
                      type="text"
                      value={teamSingers}
                      onChange={(e) => setTeamSingers(e.target.value)}
                      placeholder="Ex: Dueto com Maria / Teclado: João"
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
                </>
              )}

              {/* Campo de Observações / Detalhes */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  💬 Observações ou recado para a organização (opcional):
                </label>
                <textarea
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Ex: Preciso de microfone sem fio / Tema da historinha: A Arca de Noé"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={saving || (!searchTerm.trim() && !selectedPerson)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '1rem',
                  border: 'none',
                  cursor: (saving || (!searchTerm.trim() && !selectedPerson)) ? 'not-allowed' : 'pointer',
                  opacity: (saving || (!searchTerm.trim() && !selectedPerson)) ? 0.6 : 1,
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                  transition: 'background 0.2s'
                }}
              >
                {saving ? 'Salvando...' : '✅ Confirmar Participação'}
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
