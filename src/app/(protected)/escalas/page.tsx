'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import Header from '@/components/layout/Header';
import EscalasCalendar from '@/components/ui/EscalasCalendar';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, Mic, Headset, Shield, GraduationCap } from 'lucide-react';

type EscalaTab = 'pregadores' | 'musica' | 'sonoplastia' | 'diaconato' | 'escola_sabatina';

export default function EscalasPage() {
  const { roles, isAdmin } = useAuth();
  const supabase = createClient();
  
  // Keep live roles refreshed from Supabase to prevent stale session permissions
  const [liveRoles, setLiveRoles] = useState<string[]>(roles);

  useEffect(() => {
    async function refreshRoles() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: uData } = await supabase
            .from('users')
            .select('app_roles:user_app_roles(app_role:app_roles(name))')
            .eq('id', user.id)
            .single();
          if (uData?.app_roles) {
            const rNames = (uData.app_roles as any[]).map((r: any) => r.app_role?.name).filter(Boolean);
            setLiveRoles(rNames);
          }
        }
      } catch (err) {
        console.error('Error refreshing roles in EscalasPage:', err);
      }
    }
    refreshRoles();
  }, [supabase]);

  // Combine roles from hook and live query
  const combinedRoles = useMemo(() => {
    return Array.from(new Set([...roles, ...liveRoles]));
  }, [roles, liveRoles]);

  const canSeeAll = isAdmin || combinedRoles.includes('admin') || combinedRoles.includes('anciao');
  const canSeeMusica = canSeeAll || combinedRoles.includes('musica');
  const canSeeSonoplastia = canSeeAll || combinedRoles.includes('sonoplastia');
  const canSeeDiaconato = canSeeAll || combinedRoles.includes('diacono');
  const canSeeEscolaSabatina = canSeeAll || combinedRoles.includes('escola_sabatina');

  const availableTabs = useMemo(() => {
    const tabs: Array<{ id: EscalaTab; label: string; icon: React.ReactNode }> = [];
    if (canSeeAll) tabs.push({ id: 'pregadores', label: 'Púlpito (Anciãos)', icon: <BookOpen size={18} /> });
    if (canSeeMusica) tabs.push({ id: 'musica', label: 'Ministério da Música', icon: <Mic size={18} /> });
    if (canSeeSonoplastia) tabs.push({ id: 'sonoplastia', label: 'Sonoplastia', icon: <Headset size={18} /> });
    if (canSeeDiaconato) tabs.push({ id: 'diaconato', label: 'Diaconato', icon: <Shield size={18} /> });
    if (canSeeEscolaSabatina) tabs.push({ id: 'escola_sabatina', label: 'Escola Sabatina', icon: <GraduationCap size={18} /> });
    return tabs;
  }, [canSeeAll, canSeeMusica, canSeeSonoplastia, canSeeDiaconato, canSeeEscolaSabatina]);

  // Set initial tab based on permissions
  const [activeTab, setActiveTab] = useState<EscalaTab>(() => {
    if (canSeeAll) return 'pregadores';
    if (combinedRoles.includes('diacono')) return 'diaconato';
    if (combinedRoles.includes('escola_sabatina')) return 'escola_sabatina';
    if (combinedRoles.includes('musica')) return 'musica';
    if (combinedRoles.includes('sonoplastia')) return 'sonoplastia';
    return 'pregadores';
  });

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  return (
    <>
      <Header title="Central de Escalas" onMenuToggle={() => {}} />

      <div className="app-content" style={{ padding: 'var(--space-3) var(--space-2)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          
          {/* Department Selector Box (Dropdown & Pill Buttons) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '16px',
            backgroundColor: 'var(--surface)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
                  Departamento:
                </span>
                {availableTabs.length <= 1 && availableTabs[0] && (
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)' }}>
                    {availableTabs[0].label}
                  </span>
                )}
              </div>
              
              {/* Dropdown Selector - Native, matches agenda dropdown and works 100% on Mobile */}
              {availableTabs.length > 1 && (
                <select 
                  value={activeTab} 
                  onChange={(e) => setActiveTab(e.target.value as EscalaTab)}
                  className="input"
                  style={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '2px solid var(--primary)',
                    backgroundColor: 'var(--background)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    minWidth: '180px'
                  }}
                >
                  {availableTabs.map(tab => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Pill Buttons for Quick Tap Switching */}
            {availableTabs.length > 1 && (
              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingTop: '4px',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none'
              }}>
                {availableTabs.map(tab => {
                  const isSelected = activeTab === tab.id;
                  return (
                    <button 
                      key={tab.id}
                      className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 700 : 500,
                        borderRadius: '20px',
                        boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none'
                      }}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {activeTab === 'pregadores' && canSeeAll && (
            <EscalasCalendar 
              title="Escala de Pregadores" 
              icon={<BookOpen size={20} color="var(--primary)" />}
              eventTypesToInclude={['Culto', 'Programa Jovem', 'Desbravadores', 'Batismo', 'Evento Especial']}
              rolesToManage={['Pregador(a)']}
            />
          )}

          {activeTab === 'musica' && canSeeMusica && (
            <EscalasCalendar 
              title="Escala do Ministério da Música" 
              icon={<Mic size={20} color="var(--primary)" />}
              eventTypesToInclude={['Culto', 'Programa Jovem', 'Desbravadores', 'Batismo', 'Evento Especial']}
              rolesToManage={['Líder de Louvor', 'Cantor(a) Solo', 'Cantor(a) Congregacional']}
            />
          )}

          {activeTab === 'sonoplastia' && canSeeSonoplastia && (
            <EscalasCalendar 
              title="Escala de Sonoplastia" 
              icon={<Headset size={20} color="var(--primary)" />}
              eventTypesToInclude={['Culto', 'Programa Jovem', 'Desbravadores', 'Batismo', 'Evento Especial']}
              rolesToManage={['Sonoplasta']}
            />
          )}

          {activeTab === 'diaconato' && canSeeDiaconato && (
            <EscalasCalendar 
              title="Escala de Diaconato" 
              icon={<Shield size={20} color="var(--primary)" />}
              eventTypesToInclude={['Culto', 'Programa Jovem', 'Desbravadores', 'Batismo', 'Evento Especial']}
              rolesToManage={['Diácono / Diaconisa']}
            />
          )}

          {activeTab === 'escola_sabatina' && canSeeEscolaSabatina && (
            <EscalasCalendar 
              title="Escala da Escola Sabatina" 
              icon={<GraduationCap size={20} color="var(--primary)" />}
              eventTypesToInclude={['Culto', 'Escola Sabatina', 'Programa Jovem', 'Evento Especial']}
              rolesToManage={['Abertura da Escola Sabatina']}
            />
          )}

        </div>
      </div>
    </>
  );
}
