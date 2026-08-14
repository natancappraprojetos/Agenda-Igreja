'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/lib/hooks/useToast';
import type { Person } from '@/lib/types';

interface PersonSelectProps {
  value: string; // person_id
  onChange: (personId: string) => void;
  placeholder?: string;
  label?: string;
  roleId?: string; // Optional: filter by role
}

export default function PersonSelect({ value, onChange, placeholder = 'Selecione uma pessoa', label }: PersonSelectProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states for new person
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  const supabase = createClient();
  const { addToast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch people
  useEffect(() => {
    const fetchPeople = async () => {
      setLoading(true);
      let query = supabase.from('people').select('*').eq('is_active', true).order('name');
      
      const { data } = await query;
      if (data) setPeople(data as Person[]);
      setLoading(false);
    };
    fetchPeople();
  }, [supabase]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedPerson = people.find(p => p.id === value);
  const filteredPeople = people.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleCreateNew = async () => {
    if (!newName.trim()) {
      addToast({ type: 'error', title: 'Nome é obrigatório' });
      return;
    }
    
    setSavingNew(true);
    try {
      const { data, error } = await supabase
        .from('people')
        .insert({ name: newName.trim(), whatsapp: newWhatsapp.trim() || null })
        .select()
        .single();
        
      if (error) throw error;
      
      if (data) {
        setPeople(prev => [...prev, data as Person].sort((a, b) => a.name.localeCompare(b.name)));
        onChange(data.id);
        setIsModalOpen(false);
        setIsOpen(false);
        setNewName('');
        setNewWhatsapp('');
        addToast({ type: 'success', title: 'Pessoa cadastrada e selecionada!' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao cadastrar pessoa' });
    } finally {
      setSavingNew(false);
    }
  };

  const openCreateModal = () => {
    setNewName(searchTerm);
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
        <span style={{ color: selectedPerson ? 'inherit' : 'var(--text-secondary)' }}>
          {selectedPerson ? selectedPerson.name : placeholder}
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
              placeholder="Buscar ou digitar novo nome..." 
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
                {filteredPeople.map(person => (
                  <div 
                    key={person.id}
                    style={{ 
                      padding: '10px 12px', cursor: 'pointer', 
                      backgroundColor: value === person.id ? 'var(--bg-secondary)' : 'transparent',
                      borderBottom: '1px solid var(--border-color)',
                      fontWeight: value === person.id ? 600 : 400
                    }}
                    onClick={() => { onChange(person.id); setIsOpen(false); setSearchTerm(''); }}
                  >
                    {person.name}
                  </div>
                ))}
                
                {/* Cadastrar Novo Option */}
                {searchTerm && !filteredPeople.find(p => p.name.toLowerCase() === searchTerm.toLowerCase()) && (
                  <div 
                    style={{ 
                      padding: '10px 12px', cursor: 'pointer', 
                      color: 'var(--primary)', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                    onClick={openCreateModal}
                  >
                    <span>+</span> Cadastrar novo: &quot;{searchTerm}&quot;
                  </div>
                )}
                
                {!searchTerm && (
                  <div 
                    style={{ 
                      padding: '10px 12px', cursor: 'pointer', 
                      color: 'var(--primary)', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                    onClick={openCreateModal}
                  >
                    <span>+</span> Cadastrar nova pessoa
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Nova Pessoa"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreateNew} disabled={savingNew}>
            {savingNew ? 'Salvando...' : 'Salvar e Selecionar'}
          </button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">Nome Completo *</label>
          <input type="text" className="form-input" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">WhatsApp (Opcional)</label>
          <input type="text" className="form-input" value={newWhatsapp} onChange={e => setNewWhatsapp(e.target.value)} placeholder="(DD) 90000-0000" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
            Útil para enviar a escala diretamente para esta pessoa depois.
          </span>
        </div>
      </Modal>
    </div>
  );
}
