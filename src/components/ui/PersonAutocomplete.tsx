'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/lib/hooks/useToast';
import type { Person } from '@/lib/types';

interface PersonAutocompleteProps {
  onSelect: (person: Person | null, name: string) => void;
  placeholder?: string;
  label?: string;
}

export default function PersonAutocomplete({ onSelect, placeholder = 'Nome da pessoa', label }: PersonAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Person[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    onSelect(null, searchTerm);

    if (searchTerm.length >= 2) {
      const fetchSuggestions = async () => {
        const { data } = await supabase
          .from('people')
          .select('*')
          .ilike('name', `%${searchTerm}%`)
          .eq('is_active', true)
          .limit(5);
          
        if (data) {
          setSuggestions(data as Person[]);
        } else {
          setSuggestions([]);
        }
        setIsOpen(true);
      };
      
      const timeoutId = setTimeout(() => {
        fetchSuggestions();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      setIsOpen(false);
    }
  }, [searchTerm, supabase]);

  const handleSelect = (person: Person) => {
    setSearchTerm(person.name);
    setIsOpen(false);
    onSelect(person, person.name);
  };

  const handleCreateNew = async () => {
    if (!newName.trim()) {
      addToast({ type: 'error', title: 'Nome é obrigatório' });
      return;
    }
    
    setSavingNew(true);
    try {
      // Check if person exists
      const { data: existing } = await supabase
        .from('people')
        .select('*')
        .ilike('name', newName.trim())
        .limit(1)
        .maybeSingle();

      let finalData = existing;

      if (!existing) {
        const { data, error } = await supabase
          .from('people')
          .insert({ name: newName.trim(), whatsapp: newWhatsapp.trim() || null })
          .select()
          .single();
        if (error) throw error;
        finalData = data;
      }
        
      if (finalData) {
        setSearchTerm(finalData.name);
        onSelect(finalData as Person, finalData.name);
        setIsModalOpen(false);
        setIsOpen(false);
        setNewName('');
        setNewWhatsapp('');
        addToast({ type: 'success', title: 'Pessoa cadastrada com sucesso!' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao cadastrar pessoa' });
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <>
      <div className="form-group" style={{ position: 'relative', zIndex: isOpen ? 1000 : 10 }} ref={dropdownRef}>
        {label && <label className="form-label">{label}</label>}
        
        <input
          type="text"
          className="form-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={e => {
            const val = e.target.value;
            setSearchTerm(val);
            onSelect(null, val);
            if (val.length >= 2) {
              setIsOpen(true);
            } else {
              setIsOpen(false);
            }
          }}
          onFocus={() => {
            if (searchTerm.length >= 2) {
              setIsOpen(true);
            }
          }}
          autoComplete="off"
        />

        {isOpen && searchTerm.length >= 2 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            marginTop: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 50,
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {suggestions.map(person => (
              <div 
                key={person.id}
                style={{ 
                  padding: '10px 12px', cursor: 'pointer', 
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column'
                }}
                onClick={() => handleSelect(person)}
              >
                <span style={{ fontWeight: 500 }}>{person.name}</span>
                {person.whatsapp && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{person.whatsapp}</span>}
              </div>
            ))}
            
            <div 
              style={{ 
                padding: '10px 12px', cursor: 'pointer', 
                color: 'var(--primary)', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onClick={() => {
                setNewName(searchTerm);
                setIsModalOpen(true);
                setIsOpen(false);
              }}
            >
              📝 Cadastrar nova pessoa
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Nova Pessoa">
        <div style={{ padding: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Nome Completo</label>
            <input type="text" className="form-input" value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">WhatsApp (Opcional)</label>
            <input type="text" className="form-input" value={newWhatsapp} onChange={e => setNewWhatsapp(e.target.value)} placeholder="(DD) 99999-9999" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: 'var(--space-6)' }}>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleCreateNew} disabled={savingNew}>
              {savingNew ? 'Salvando...' : 'Salvar Pessoa'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
