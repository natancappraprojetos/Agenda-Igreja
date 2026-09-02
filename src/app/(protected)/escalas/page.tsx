'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import Header from '@/components/layout/Header';
import EscalasCalendar from '@/components/ui/EscalasCalendar';
import { BookOpen, Mic, Headset, Shield, CalendarIcon } from 'lucide-react';

export default function EscalasPage() {
  const { roles, isAdmin } = useAuth();
  
  const canSeeAll = isAdmin || roles.includes('anciao');
  const canSeeMusica = canSeeAll || roles.includes('musica');
  const canSeeSonoplastia = canSeeAll || roles.includes('sonoplastia');
  const canSeeDiaconato = canSeeAll || roles.includes('diacono');
  
  // Set initial tab based on permissions
  const [activeTab, setActiveTab] = useState<'pregadores' | 'musica' | 'sonoplastia' | 'diaconato'>(
    canSeeAll ? 'pregadores' : 
    roles.includes('musica') ? 'musica' :
    roles.includes('sonoplastia') ? 'sonoplastia' : 
    roles.includes('diacono') ? 'diaconato' : 'pregadores'
  );

  return (
    <>
      <Header title="Central de Escalas" onMenuToggle={() => {}} />

      <div className="app-content">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          
          {/* Tabs for Departments - Only show if user has access to multiple */}
          {canSeeAll && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)', overflowX: 'auto' }}>
              <button 
                className={`btn ${activeTab === 'pregadores' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('pregadores')}
              >
                <BookOpen size={18} /> Púlpito (Anciãos)
              </button>
              <button 
                className={`btn ${activeTab === 'musica' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('musica')}
              >
                <Mic size={18} /> Ministério da Música
              </button>
              <button 
                className={`btn ${activeTab === 'sonoplastia' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('sonoplastia')}
              >
                <Headset size={18} /> Sonoplastia
              </button>
              <button 
                className={`btn ${activeTab === 'diaconato' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('diaconato')}
              >
                <Shield size={18} /> Diaconato
              </button>
            </div>
          )}

          <div style={{ backgroundColor: 'var(--background-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <CalendarIcon size={20} color="var(--primary)" />
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>Visão de Liderança</span>
            </div>
            <p style={{ margin: 'var(--space-2) 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Selecione o evento desejado no calendário abaixo para atribuir as funções. Os espaços de rascunho (tracejados) foram criados especificamente para gerenciar a escala e não aparecem na Agenda Geral pública.
            </p>
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
              rolesToManage={['Diácono/Diaconisa']}
            />
          )}

        </div>
      </div>
    </>
  );
}
