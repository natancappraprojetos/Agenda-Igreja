'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import Header from '@/components/layout/Header';
import EscalasGrid from '@/components/ui/EscalasGrid';
import { BookOpen, Mic, Headset, Shield, CalendarIcon } from 'lucide-react';

export default function EscalasPage() {
  const { roles, isAdmin } = useAuth();
  
  // Set initial tab based on permissions
  const [activeTab, setActiveTab] = useState<'pregadores' | 'musica' | 'sonoplastia' | 'diaconato'>(
    isAdmin || roles.includes('anciao') ? 'pregadores' : 'musica'
  );

  return (
    <>
      <Header title="Central de Escalas" onMenuToggle={() => {}} />

      <div className="app-content">
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          
          {/* Tabs for Departments */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)', overflowX: 'auto' }}>
            {(isAdmin || roles.includes('anciao')) && (
              <button 
                className={`btn ${activeTab === 'pregadores' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('pregadores')}
              >
                <BookOpen size={18} /> Púlpito (Anciãos)
              </button>
            )}
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

          <div style={{ backgroundColor: 'var(--background-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <CalendarIcon size={20} color="var(--primary)" />
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>Visão de Liderança</span>
            </div>
            <p style={{ margin: 'var(--space-2) 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Selecione o nome da pessoa na data desejada para escalar automaticamente. Essa alteração refletirá instantaneamente na Agenda Geral e no painel do Culto.
            </p>
          </div>

          {activeTab === 'pregadores' && (
            <EscalasGrid 
              title="Escala de Pregadores" 
              icon={<BookOpen size={20} color="var(--primary)" />}
              eventTypesToInclude={['Culto de Sábado', 'Culto de Quarta', 'Culto de Domingo']}
              rolesToManage={['Pregador(a)']}
            />
          )}

          {activeTab === 'musica' && (
            <EscalasGrid 
              title="Escala do Ministério da Música" 
              icon={<Mic size={20} color="var(--primary)" />}
              eventTypesToInclude={['Culto de Sábado', 'Culto de Quarta', 'Culto de Domingo', 'Programa Jovem']}
              rolesToManage={['Cantor(a) Solo', 'Cantor(a) Congregacional']}
            />
          )}

          {activeTab === 'sonoplastia' && (
            <EscalasGrid 
              title="Escala de Sonoplastia" 
              icon={<Headset size={20} color="var(--primary)" />}
              // Não filtramos por tipo de evento específico, queremos TODOS os eventos (Pode ter Casamento, Reunião, etc)
              // Deixando eventTypesToInclude vazio, ele vai pegar "Culto" por padrão como definimos no componente, mas você pode mudar para puxar todos se quiser.
              rolesToManage={['Sonoplasta']}
            />
          )}

          {activeTab === 'diaconato' && (
            <EscalasGrid 
              title="Escala de Diaconato" 
              icon={<Shield size={20} color="var(--primary)" />}
              rolesToManage={['Diácono/Diaconisa']}
            />
          )}

        </div>
      </div>
    </>
  );
}
