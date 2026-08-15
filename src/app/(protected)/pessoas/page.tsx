'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { Users, Mail, Phone } from 'lucide-react';
import type { Person } from '@/lib/types';

export default function PessoasPage() {
  const [items, setItems] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  
  const [editItem, setEditItem] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { addToast } = useToast();

  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('people').select('*').order('name');
    setItems((data || []) as Person[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => { 
    setName(''); 
    setWhatsapp(''); 
    setEmail(''); 
    setIsActive(true); 
    setEditItem(null); 
  };

  const openEdit = (item: Person) => {
    setEditItem(item); 
    setName(item.name); 
    setWhatsapp(item.whatsapp || '');
    setEmail(item.email || ''); 
    setIsActive(item.is_active); 
    setModalOpen(true);
  };

  const formatPhone = (val: string) => {
    return val.replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4,5})(\d{4})/, '$1-$2')
      .slice(0, 15);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { 
      addToast({ type: 'error', title: 'Nome é obrigatório' }); 
      return; 
    }
    
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        whatsapp: whatsapp.replace(/\D/g, '') || null,
        email: email.trim() || null,
        is_active: isActive
      };

      if (editItem) {
        await supabase.from('people').update(payload).eq('id', editItem.id);
      } else {
        await supabase.from('people').insert(payload);
      }
      
      addToast({ type: 'success', title: editItem ? 'Pessoa atualizada!' : 'Pessoa cadastrada!' });
      setModalOpen(false); 
      resetForm(); 
      fetchData();
    } catch { 
      addToast({ type: 'error', title: 'Erro ao salvar' }); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    
    const lines = importText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    if (lines.length === 0) return;
    
    setImporting(true);
    try {
      const payload = lines.map(name => ({
        name,
        is_active: true
      }));
      
      const { error } = await supabase.from('people').insert(payload);
      
      if (error) throw error;
      
      addToast({ type: 'success', title: `${lines.length} pessoas importadas com sucesso!` });
      setImportModalOpen(false);
      setImportText('');
      fetchData();
    } catch (e) {
      console.error(e);
      addToast({ type: 'error', title: 'Erro ao importar pessoas' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Header title="Cadastro de Pessoas" onMenuToggle={() => {}}>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setImportModalOpen(true)}>
            📥 Importar Lista
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setModalOpen(true); }}>
            ➕ Nova Pessoa
          </button>
        </div>
      </Header>
      
      <div className="app-content">
        {loading ? (
          <div className="loading-page"><div className="spinner spinner-lg" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={48} color="var(--text-tertiary)" /></div>
            <div className="empty-state-title">Nenhuma pessoa cadastrada</div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>Comece cadastrando a equipe da comissão, músicos e líderes.</p>
            <button className="btn btn-primary" onClick={() => { resetForm(); setModalOpen(true); }}>➕ Cadastrar Pessoa</button>
          </div>
        ) : (
          <div className="card" style={{ padding: '0' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} onClick={() => openEdit(item)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.whatsapp && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <Phone size={14} /> {formatPhone(item.whatsapp)}
                          </div>
                        )}
                        {item.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <Mail size={14} /> {item.email}
                          </div>
                        )}
                        {!item.whatsapp && !item.email && <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Sem contato</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.is_active ? (
                        <span className="badge" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>Ativo</span>
                      ) : (
                        <span className="badge badge-neutral">Inativo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }}
          title={editItem ? 'Editar Pessoa' : 'Nova Pessoa'}
          footer={<>
            <button className="btn btn-secondary" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </>}
        >
          <form id="person-form" onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Nome Completo *</label>
              <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João da Silva" required autoFocus />
            </div>
            
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input 
                type="tel" 
                className="form-input" 
                value={whatsapp} 
                onChange={e => setWhatsapp(formatPhone(e.target.value))} 
                placeholder="(00) 00000-0000" 
              />
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@exemplo.com" />
            </div>

            <div className="form-checkbox-group">
              <input type="checkbox" id="person_active" className="form-checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
              <label htmlFor="person_active" className="form-checkbox-label">Cadastro Ativo</label>
            </div>
          </form>
        </Modal>

        {/* Import Modal */}
        <Modal 
          isOpen={importModalOpen} 
          onClose={() => setImportModalOpen(false)}
          title="Importar Membros"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setImportModalOpen(false)} disabled={importing}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing || !importText.trim()}>
                {importing ? 'Importando...' : 'Importar Lista'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Cole os nomes (um por linha)</label>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-2)' }}>
              Copie do Excel ou Bloco de Notas e cole aqui. O sistema criará um cadastro para cada nome.
            </p>
            <textarea 
              className="form-input" 
              style={{ minHeight: '200px', resize: 'vertical' }}
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="João da Silva&#10;Maria Souza&#10;Pedro Santos"
              autoFocus
            />
          </div>
        </Modal>
      </div>
    </>
  );
}
