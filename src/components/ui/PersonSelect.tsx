'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/lib/hooks/useToast';
import type { Person } from '@/lib/types';

interface PersonSelectProps {
  value: string; // person_id
  onChange: (personId: string | null, person?: Person | null) => void;
  placeholder?: string;
  label?: string;
  roleId?: string; // Optional: filter by role
  ministryId?: string; // Optional: filter by ministry
}

export default function PersonSelect({ value, onChange, placeholder = 'Selecione uma pessoa', label, roleId, ministryId }: PersonSelectProps) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states for new person
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [savingNew, setSavingNew] = useState(false);
  
  // Global search
  const [globalSuggestions, setGlobalSuggestions] = useState<Person[]>([]);

  const supabase = createClient();
  const { addToast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch people
  useEffect(() => {
    const fetchPeople = async () => {
      setLoading(true);
      let query = supabase.from('people').select(`
        id, name, is_active,
        person_roles(role:roles(name)),
        person_ministries(ministry:ministries(name))
      `).eq('is_active', true).order('name');
      
      if (roleId) {
        const { data: prData } = await supabase.from('person_roles').select('person_id').eq('role_id', roleId);
        if (prData && prData.length > 0) {
          const personIds = prData.map(pr => pr.person_id);
          query = query.in('id', personIds);
        } else if (!ministryId) { // if ministryId is also present, we might want to check both, but let's keep it simple
          setPeople([]);
          setLoading(false);
          return;
        }
      }
      
      if (ministryId) {
        // Find people in this ministry directly
        const { data: pmData } = await supabase.from('person_ministries').select('person_id').eq('ministry_id', ministryId);
        let personIds = pmData ? pmData.map(pm => pm.person_id) : [];
        
        // Smart match: get ministry name to find related roles (like Ancionato -> Ancião)
        const { data: minData } = await supabase.from('ministries').select('name').eq('id', ministryId).maybeSingle();
        if (minData) {
          const mName = minData.name.toLowerCase();
          let searchWords = [];
          if (mName.includes('ancionato')) searchWords.push('anciã', 'ancião');
          else if (mName.includes('desbravador')) searchWords.push('desbravador', 'diretor');
          else if (mName.includes('jovem')) searchWords.push('jovem', 'diretor');
          else if (mName.includes('música') || mName.includes('louvor')) searchWords.push('cantor', 'música', 'louvor', 'sonoplasta');
          else if (mName.includes('diaconato')) searchWords.push('diácono', 'diaconisa');
          else if (mName.includes('sabatina')) searchWords.push('professor', 'sabatina');
          else searchWords.push(mName); // fallback to exact name part

          if (searchWords.length > 0) {
            // Find roles that match these words
            let roleQuery = supabase.from('roles').select('id');
            // Supabase ilike on multiple ORs is tricky, we'll fetch all roles and filter in JS for simplicity since roles are few
            const { data: allRoles } = await supabase.from('roles').select('id, name');
            if (allRoles) {
               const matchedRoleIds = allRoles.filter(r => searchWords.some(w => r.name.toLowerCase().includes(w))).map(r => r.id);
               if (matchedRoleIds.length > 0) {
                 const { data: prData } = await supabase.from('person_roles').select('person_id').in('role_id', matchedRoleIds);
                 if (prData) {
                   personIds = [...personIds, ...prData.map(pr => pr.person_id)];
                 }
               }
            }
          }
        }
        
        personIds = Array.from(new Set(personIds)); // remove duplicates

        if (personIds.length > 0) {
          query = supabase.from('people').select(`
          id, name, is_active,
          person_roles(role:roles(name)),
          person_ministries(ministry:ministries(name))
        `).eq('is_active', true).order('name').in('id', personIds);
        } else {
          setPeople([]);
          setLoading(false);
          return;
        }
      }
      
      const { data } = await query;
      let fetchedPeople = (data as Person[]) || [];

      // Always fetch the selected person if they are not in the list (e.g. inactive visitor)
      if (value && !fetchedPeople.find(p => p.id === value)) {
        const { data: valData } = await supabase.from('people').select(`
          id, name, is_active,
          person_roles(role:roles(name)),
          person_ministries(ministry:ministries(name))
        `).eq('id', value).maybeSingle();
        if (valData) {
          fetchedPeople = [...fetchedPeople, valData as Person];
        }
      }
      
      setPeople(fetchedPeople);
      setLoading(false);
    };
    if (isOpen || value) { // Fetch if open or if there's a value to resolve
      fetchPeople();
    }
  }, [supabase, roleId, isOpen, value]);

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

  // Global search effect
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timer = setTimeout(async () => {
        const { data } = await supabase
          .from('people')
          .select('*')
          .ilike('name', `%${searchTerm}%`)
          .eq('is_active', true)
          .limit(5);
        if (data) {
          // Filter out people already in local 'people'
          const newSuggestions = data.filter(d => !people.some(p => p.id === d.id));
          setGlobalSuggestions(newSuggestions as Person[]);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setGlobalSuggestions([]);
    }
  }, [searchTerm, supabase, people]);

  const handleCreateNew = async () => {
    if (!newName.trim()) {
      addToast({ type: 'error', title: 'Nome é obrigatório' });
      return;
    }
    
    setSavingNew(true);
    try {
      let finalData = null;
      
      // Check if person exists
      const { data: existing } = await supabase
        .from('people')
        .select('*')
        .ilike('name', newName.trim())
        .limit(1)
        .maybeSingle();

      if (existing) {
        finalData = existing;
      } else {
        const { data, error } = await supabase
          .from('people')
          .insert({ name: newName.trim(), whatsapp: newWhatsapp.trim() || null })
          .select()
          .single();
        if (error) throw error;
        finalData = data;
      }
        
      if (finalData) {
        if (roleId) {
          // Verify if not already linked
          const { data: linkExists } = await supabase
            .from('person_roles')
            .select('id')
            .eq('person_id', finalData.id)
            .eq('role_id', roleId)
            .maybeSingle();
            
          if (!linkExists) {
            await supabase.from('person_roles').insert({ person_id: finalData.id, role_id: roleId });
          }
        }
        
        // Add to local state if not exists
        setPeople(prev => {
          if (!prev.find(p => p.id === finalData.id)) {
            return [...prev, finalData as Person].sort((a, b) => a.name.localeCompare(b.name));
          }
          return prev;
        });
        
        onChange(finalData.id, finalData as Person);
        setIsModalOpen(false);
        setIsOpen(false);
        setNewName('');
        setNewWhatsapp('');
        addToast({ type: 'success', title: 'Pessoa cadastrada e vinculada à função!' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao cadastrar pessoa' });
    } finally {
      setSavingNew(false);
    }
  };

  const handleFastCreate = async (name: string, isTemporary: boolean = false) => {
    setSavingNew(true);
    try {
      let finalData = null;
      
      const { data: existing } = await supabase
        .from('people')
        .select('*')
        .ilike('name', name.trim())
        .maybeSingle();

      if (existing) {
        finalData = existing;
        if (!existing.is_active && !isTemporary) {
           await supabase.from('people').update({ is_active: true }).eq('id', existing.id);
        }
      } else {
        // Use Server Action to bypass RLS
        const { createPersonAdmin } = await import('@/app/actions');
        finalData = await createPersonAdmin(name, isTemporary);
      }
      
      if (finalData) {
        if (roleId) {
          const { data: linkExists } = await supabase
            .from('person_roles')
            .select('id')
            .eq('person_id', finalData.id)
            .eq('role_id', roleId)
            .maybeSingle();
            
          if (!linkExists) {
            await supabase.from('person_roles').insert({ person_id: finalData.id, role_id: roleId });
          }
        }
        
        setPeople(prev => {
          if (!prev.find(p => p.id === finalData.id)) {
            return [...prev, finalData as Person].sort((a, b) => a.name.localeCompare(b.name));
          }
          return prev;
        });
        
        onChange(finalData.id, finalData as Person);
        setIsOpen(false);
        setSearchTerm('');
        addToast({ type: 'success', title: isTemporary ? 'Visitante adicionado para este evento!' : 'Pessoa adicionada e vinculada!' });
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao cadastrar pessoa' });
    } finally {
      setSavingNew(false);
    }
  };

  const handleQuickAdd = async (name: string) => {
    setSavingNew(true);
    try {
      let finalData = null;
      
      const { data: existing } = await supabase
        .from('people')
        .select('*')
        .ilike('name', name.trim())
        .maybeSingle();

      if (existing) {
        finalData = existing;
      } else {
        // Use Server Action to bypass RLS
        const { createPersonAdmin } = await import('@/app/actions');
        finalData = await createPersonAdmin(name, true);
      }
      
      if (finalData) {
        if (roleId) {
          const { data: linkExists } = await supabase
            .from('person_roles')
            .select('id')
            .eq('person_id', finalData.id)
            .eq('role_id', roleId)
            .maybeSingle();
            
          if (!linkExists) {
            await supabase.from('person_roles').insert({ person_id: finalData.id, role_id: roleId });
          }
        }
        
        setPeople(prev => {
          if (!prev.find(p => p.id === finalData.id)) {
            return [...prev, finalData as Person].sort((a, b) => a.name.localeCompare(b.name));
          }
          return prev;
        });
        
        onChange(finalData.id, finalData as Person);
        setIsOpen(false);
        setSearchTerm('');
      }
    } catch (err) {
      addToast({ type: 'error', title: 'Erro ao adicionar' });
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
    <div className="form-group" style={{ position: 'relative', zIndex: isOpen ? 1000 : 10 }} ref={dropdownRef}>
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
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  e.preventDefault();
                  const match = filteredPeople.find(p => p.name.toLowerCase() === searchTerm.trim().toLowerCase());
                  if (match) {
                    onChange(match.id, match);
                    setIsOpen(false);
                    setSearchTerm('');
                  } else {
                    handleQuickAdd(searchTerm.trim());
                  }
                }
              }}
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>Carregando...</div>
            ) : (
              <>
                {value && (
                  <div 
                    className="dropdown-item"
                    onClick={() => {
                      onChange(null, null);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      color: 'var(--text-danger)',
                      borderBottom: '1px solid var(--border)',
                      fontWeight: 600
                    }}
                  >
                    🗑️ Limpar seleção
                  </div>
                )}
                
                {(!roleId && !ministryId && !searchTerm.trim()) ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Digite um nome para buscar...
                  </div>
                ) : (
                  <>
                    {filteredPeople.map(person => (
                      <div 
                        key={person.id}
                        style={{ 
                          padding: '10px 12px', cursor: 'pointer', 
                          backgroundColor: value === person.id ? 'var(--background-secondary)' : 'transparent',
                          borderBottom: '1px solid var(--border)',
                          fontWeight: value === person.id ? 600 : 400
                        }}
                        onClick={() => { onChange(person.id, person); setIsOpen(false); setSearchTerm(''); }}
                      >
                        {person.name}
                      </div>
                    ))}
                    
                    {globalSuggestions.length > 0 && (
                      <>
                        <div style={{ padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', backgroundColor: 'var(--background-secondary)', textTransform: 'uppercase' }}>
                          Pessoas na Igreja
                        </div>
                        {globalSuggestions.map(person => (
                          <div 
                            key={person.id}
                            style={{ 
                              padding: '10px 12px', cursor: 'pointer', 
                              borderBottom: '1px solid var(--border)'
                            }}
                            onClick={async () => {
                              // Immediately assign role and select
                              if (roleId) {
                                const { data: linkExists } = await supabase
                                  .from('person_roles')
                                  .select('id')
                                  .eq('person_id', person.id)
                                  .eq('role_id', roleId)
                                  .maybeSingle();
                                  
                                if (!linkExists) {
                                  await supabase.from('person_roles').insert({ person_id: person.id, role_id: roleId });
                                }
                              }
                              setPeople(prev => [...prev, person].sort((a, b) => a.name.localeCompare(b.name)));
                              onChange(person.id, person);
                              setIsOpen(false);
                              setSearchTerm('');
                            }}
                          >
                            {person.name}
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
                
                {/* Cadastrar Novo Option */}
                {searchTerm && !filteredPeople.find(p => p.name.toLowerCase() === searchTerm.toLowerCase()) && (
                  <>
                    <div 
                      style={{ 
                        padding: '10px 12px', cursor: 'pointer', 
                        color: 'var(--primary)', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '8px',
                        borderTop: '1px solid var(--border)'
                      }}
                      onClick={() => handleQuickAdd(searchTerm)}
                    >
                      <span>⚡</span> {savingNew ? 'Adicionando...' : `Usar "${searchTerm}" (Enter)`}
                    </div>
                    
                    <div 
                      style={{ 
                        padding: '10px 12px', cursor: 'pointer', 
                        color: 'var(--text-secondary)', fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        borderTop: '1px solid var(--border-light)'
                      }}
                      onClick={openCreateModal}
                    >
                      <span>📝</span> Cadastrar com WhatsApp/Email
                    </div>
                  </>
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
