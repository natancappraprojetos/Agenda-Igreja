'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import type { Song } from '@/lib/types';

export default function MusicasPage() {
  const [items, setItems] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Song | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [category, setCategory] = useState('');
  const [durationApprox, setDurationApprox] = useState('');
  const [link, setLink] = useState('');
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('songs').select('*').eq('is_active', true).order('title');
    setItems((data || []) as Song[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setTitle(''); setArtist(''); setCategory(''); setDurationApprox('');
    setLink(''); setNotes(''); setEditItem(null);
  };

  const openEdit = (item: Song) => {
    setEditItem(item); setTitle(item.title); setArtist(item.artist || '');
    setCategory(item.category || ''); setDurationApprox(item.duration_approx || '');
    setLink(item.link || ''); setNotes(item.notes || ''); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { addToast({ type: 'error', title: 'Título obrigatório' }); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(), artist: artist || null, category: category || null,
        duration_approx: durationApprox || null, link: link || null, notes: notes || null,
      };
      if (editItem) {
        await supabase.from('songs').update(payload).eq('id', editItem.id);
      } else {
        await supabase.from('songs').insert(payload);
      }
      addToast({ type: 'success', title: editItem ? 'Música atualizada!' : 'Música cadastrada!' });
      setModalOpen(false); resetForm(); fetchData();
    } catch { addToast({ type: 'error', title: 'Erro ao salvar' }); }
    finally { setSaving(false); }
  };

  const filtered = items.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.artist?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header title="Músicas" onMenuToggle={() => {}}>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setModalOpen(true); }}>
          ➕ Nova Música
        </button>
      </Header>
      <div className="app-content">
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <input type="text" className="form-input" placeholder="🔍 Buscar por título ou artista..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎵</div>
            <div className="empty-state-title">{search ? 'Nenhuma música encontrada' : 'Nenhuma música cadastrada'}</div>
            {!search && <button className="btn btn-primary" onClick={() => { resetForm(); setModalOpen(true); }}>➕ Cadastrar Música</button>}
          </div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Artista</th>
                  <th>Categoria</th>
                  <th>Duração</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(song => (
                  <tr key={song.id}>
                    <td style={{ fontWeight: 600 }}>🎵 {song.title}</td>
                    <td>{song.artist || '—'}</td>
                    <td>{song.category ? <span className="badge badge-neutral">{song.category}</span> : '—'}</td>
                    <td>{song.duration_approx || '—'}</td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => openEdit(song)}>✏️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}
          title={editItem ? 'Editar Música' : 'Nova Música'}
          footer={<>
            <button className="btn btn-secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </>}
        >
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome da música" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Artista / Grupo</label>
            <input type="text" className="form-input" value={artist} onChange={e => setArtist(e.target.value)} placeholder="Ex: CD Jovem" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Categoria</label>
              <input type="text" className="form-input" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Louvor" />
            </div>
            <div className="form-group">
              <label className="form-label">Duração</label>
              <input type="text" className="form-input" value={durationApprox} onChange={e => setDurationApprox(e.target.value)} placeholder="Ex: 4:30" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Link (YouTube, Spotify...)</label>
            <input type="url" className="form-input" value={link} onChange={e => setLink(e.target.value)} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas sobre a música" />
          </div>
        </Modal>
      </div>
    </>
  );
}
