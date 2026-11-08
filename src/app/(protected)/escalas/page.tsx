'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import Header from '@/components/layout/Header';
import EscalasCalendar from '@/components/ui/EscalasCalendar';
import { BookOpen, Mic, Headset, Shield, GraduationCap, CalendarIcon } from 'lucide-react';

type EscalaTab = 'pregadores' | 'musica' | 'sonoplastia' | 'diaconato' | 'escola_sabatina';

export default function EscalasPage() {
  const { roles, isAdmin } = useAuth();
  
  const canSeeAll = isAdmin || roles.includes('anciao');
  const canSeeMusica = canSeeAll || roles.includes('musica');
  const canSeeSonoplastia = canSeeAll || roles.includes('sonoplastia');
  const canSeeDiaconato = canSeeAll || roles.includes('diacono');
  const canSeeEscolaSabatina = canSeeAll || roles.includes('escola_sabatina');

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
    if (roles.includes('diacono')) return 'diaconato';
    if (roles.includes('escola_sabatina')) return 'escola_sabatina';
    if (roles.includes('musica')) return 'musica';
    if (roles.includes('sonoplastia')) return 'sonoplastia';
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
          
          {/* Tabs for Departments - Prominent on mobile and desktop */}
          {availableTabs.length > 1 ? (
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              overflowX: 'auto',
              paddingBottom: '8px',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none'
            }}>
              {availableTabs.map(tab => {
                const isSelected = activeTab === tab.id;
                return (
                  <button 
                    key={tab.id}
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      fontWeight: isSelected ? 700 : 500,
                      borderRadius: '24px',
                      boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
                    }}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.icon} {tab.label}
                  </button>
                );
              })}
            </div>
          ) : availableTabs.length === 1 ? (
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.9rem', padding: '6px 12px', borderRadius: '16px' }}>
                {availableTabs[0].icon} {availableTabs[0].label}
              </span>
            </div>
          ) : null}

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
