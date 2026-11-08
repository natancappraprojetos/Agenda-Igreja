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
  const [activeTab, setActiveTab] = useState<EscalaTab>('pregadores');

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  return (
    <>
      <Header title="Central de Escalas" onMenuToggle={() => {}} />

      <div className="app-content">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          
          {/* Tabs for Departments - Shown if user has access to 2 or more departments */}
          {availableTabs.length > 1 && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)', overflowX: 'auto' }}>
              {availableTabs.map(tab => (
                <button 
                  key={tab.id}
                  className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ backgroundColor: 'var(--background-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <CalendarIcon size={20} color="var(--primary)" />
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>Visão de Liderança</span>
            </div>
            <p style={{ margin: 'var(--space-2) 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Selecione o evento desejado no calendário abaixo para atribuir os voluntários ou clique em <strong>Tirar Escala</strong> para visualizar, imprimir ou copiar a escala do mês ou trimestre com todos os nomes.
            </p>
          </div>

          {activeTab === 'pregadores' && canSeeAll && (
            <EscalasCalendar 
              title="Escala de Pregadores" 
              icon={<BookOpen size={20} color="var(--primary)" />}
              eventTypesToInclude={['Culto', 'Programa Jovem', 'Desbravadores', 'Batismo', 'Evento Especial']}
              rolesToManage={['Pregador(a)', 'Pregador']}
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
              rolesToManage={['Diácono/Diaconisa', 'Diácono', 'Diaconisa']}
            />
          )}

          {activeTab === 'escola_sabatina' && canSeeEscolaSabatina && (
            <EscalasCalendar 
              title="Escala da Escola Sabatina" 
              icon={<GraduationCap size={20} color="var(--primary)" />}
              eventTypesToInclude={['Culto', 'Escola Sabatina', 'Programa Jovem', 'Evento Especial']}
              rolesToManage={['Escola Sabatina', 'Professor', 'Diretor']}
            />
          )}

        </div>
      </div>
    </>
  );
}
