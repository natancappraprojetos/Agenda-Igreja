'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/lib/hooks/useToast';
import type { Song } from '@/lib/types';

interface SongSelectProps {
  value: string; // song_id
  onChange: (songId: string) => void;
  placeholder?: string;
  label?: string;
}

export default function SongSelect({ value, onChange, placeholder = 'Selecione uma música', label }: SongSelectProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states for new song
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArtist, setNewArtist] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  const supabase = createClient();
  const { addToast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      const { data } = await supabase.from('songs').select('*').eq('is_active', true).order('title');
      if (data) setSongs(data as Song[]);
      setLoading(false);
    };
    fetchSongs();
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedSong = songs.find(s => s.id === value);
  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.artist && s.artist.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateNew = async () => {
    if (!newTitle.trim()) {
      addToast({ type: 'error', title: 'Título é obrigatório' });
      return;
    }
    
    setSavingNew(true);
    try {
      const { data, error } = await supabase
        .from('songs')
        .insert({ title: newTitle.trim(), artist: newArtist.trim() || null })
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        setSongs(prev => [...prev, data as Song].sort((a, b) => a.title.localeCompare(b.title)));
        onChange(data.id);
        setIsModalOpen(false);
        setIsOpen(false);
        setNewTitle('');
        setNewArtist('');
        addToast({ type: 'success', title: 'Música cadastrada e selecionada!' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao cadastrar música' });
    } finally {
      setSavingNew(false);
    }
  };

  const openCreateModal = () => {
    setNewTitle(searchTerm);
    setIsOpen(false);
    setIsModalOpen(true);
  };

  return (
    <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
      {label && <label className="form-label">{label}</label>}
      
      <div 
        className="form-input" 
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: selectedSong ? 'inherit' : 'var(--text-secondary)' }}>
          {selectedSong ? `${selectedSong.title} ${selectedSong.artist ? `(${selectedSong.artist})` : ''}` : placeholder}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          marginTop: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 50,
          maxHeight: '300px',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Buscar música ou artista..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>Carregando...</div>
            ) : (
              <>
                {filteredSongs.map(song => (
                  <div 
                    key={song.id}
                    style={{ 
                      padding: '10px 12px', cursor: 'pointer', 
                      backgroundColor: value === song.id ? 'var(--bg-secondary)' : 'transparent',
                      borderBottom: '1px solid var(--border-color)',
                      fontWeight: value === song.id ? 600 : 400
                    }}
                    onClick={() => { onChange(song.id); setIsOpen(false); setSearchTerm(''); }}
                  >
                    {song.title} {song.artist ? <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>({song.artist})</span> : ''}
                  </div>
                ))}
                
                {searchTerm && !filteredSongs.find(s => s.title.toLowerCase() === searchTerm.toLowerCase()) && (
                  <div 
                    style={{ 
                      padding: '10px 12px', cursor: 'pointer', 
                      color: 'var(--primary)', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                    onClick={openCreateModal}
                  >
                    <span>+</span> Cadastrar nova: &quot;{searchTerm}&quot;
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Nova Música"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreateNew} disabled={savingNew}>
            {savingNew ? 'Salvando...' : 'Salvar e Selecionar'}
          </button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">Título da Música *</label>
          <input type="text" className="form-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Artista / Cantor (Opcional)</label>
          <input type="text" className="form-input" value={newArtist} onChange={e => setNewArtist(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
