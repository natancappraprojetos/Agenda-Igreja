'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
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
          
        if (data && data.length > 0) {
          setSuggestions(data as Person[]);
          setIsOpen(true);
        } else {
          setIsOpen(false);
        }
      };
      
      // Debounce fetch
      const timeoutId = setTimeout(() => {
        fetchSuggestions();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      setIsOpen(false);
    }
  }, [searchTerm, supabase]); // Removed onSelect from deps to avoid infinite loops if not memoized

  const handleSelect = (person: Person) => {
    setSearchTerm(person.name);
    setIsOpen(false);
    onSelect(person, person.name);
  };

  return (
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
          // Always clear the selected person if typing, so the parent component knows it's a new name
          // If the user types a full name exactly, we can try to auto-match it, but it's safer to let the parent handle the "new person" creation with deduplication.
          onSelect(null, val);
          if (val.length >= 2) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        }}
        onFocus={() => {
          if (searchTerm.length >= 2 && suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        autoComplete="off"
      />

      {isOpen && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          marginTop: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 50,
          maxHeight: '200px',
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
        </div>
      )}
    </div>
  );
}
