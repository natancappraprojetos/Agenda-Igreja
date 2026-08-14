'use client';

import { useState, useRef, useEffect } from 'react';

interface SearchSelectProps {
  options: { id: string; label: string; sublabel?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

export default function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  label,
  disabled = false,
}: SearchSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    o.sublabel?.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
  };

  return (
    <div className="search-select" ref={ref}>
      {label && <label className="form-label">{label}</label>}
      
      {selectedOption && !isOpen ? (
        <div className="search-select-selected">
          <span className="search-select-selected-name">{selectedOption.label}</span>
          {!disabled && (
            <button className="search-select-remove" onClick={handleClear} type="button">
              ×
            </button>
          )}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <span className="search-select-icon">🔍</span>
          <input
            type="text"
            className="search-select-input"
            placeholder={placeholder}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
          />
        </div>
      )}

      {isOpen && !disabled && (
        <div className="search-select-dropdown">
          {filtered.length === 0 ? (
            <div className="search-select-empty">
              Nenhum resultado encontrado
            </div>
          ) : (
            filtered.map(option => (
              <div
                key={option.id}
                className={`search-select-option ${option.id === value ? 'selected' : ''}`}
                onClick={() => handleSelect(option.id)}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{option.label}</div>
                  {option.sublabel && (
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                      {option.sublabel}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
