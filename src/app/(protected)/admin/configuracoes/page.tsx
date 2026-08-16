'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Tags, Wrench, BookOpen } from 'lucide-react';
import LiturgiaModelosTab from './tabs/LiturgiaModelosTab';
import TiposEventoTab from './tabs/TiposEventoTab';
import TiposLiturgiaTab from './tabs/TiposLiturgiaTab';
import FuncoesTab from './tabs/FuncoesTab';
import NecessidadesTab from './tabs/NecessidadesTab';
import MensagensTab from './tabs/MensagensTab';

export default function ConfiguracoesGeraisPage() {
  const [activeTab, setActiveTab] = useState<'eventos' | 'funcoes' | 'liturgia' | 'liturgia_tipos' | 'necessidades' | 'whatsapp'>('liturgia');

  return (
    <>
      <Header title="Configurações Gerais" onMenuToggle={() => {}} />
      <div className="app-content">
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--space-6)' }}>
          <button 
            className={`btn ${activeTab === 'liturgia' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', borderBottom: activeTab === 'liturgia' ? 'none' : '' }}
            onClick={() => setActiveTab('liturgia')}
          >
            <BookOpen size={18} /> Modelos de Liturgia
          </button>
          <button 
            className={`btn ${activeTab === 'liturgia_tipos' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', borderBottom: activeTab === 'liturgia_tipos' ? 'none' : '' }}
            onClick={() => setActiveTab('liturgia_tipos')}
          >
            <BookOpen size={18} /> Tipos de Liturgia
          </button>
          
          <button 
            className={`btn ${activeTab === 'eventos' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', borderBottom: activeTab === 'eventos' ? 'none' : '' }}
            onClick={() => setActiveTab('eventos')}
          >
            <Tags size={18} /> Tipos de Evento
          </button>

          <button 
            className={`btn ${activeTab === 'funcoes' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', borderBottom: activeTab === 'funcoes' ? 'none' : '' }}
            onClick={() => setActiveTab('funcoes')}
          >
            <Wrench size={18} /> Funções da Escala
          </button>

          <button 
            className={`btn ${activeTab === 'necessidades' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', borderBottom: activeTab === 'necessidades' ? 'none' : '' }}
            onClick={() => setActiveTab('necessidades')}
          >
            <Wrench size={18} /> Necessidades
          </button>

          <button 
            className={`btn ${activeTab === 'whatsapp' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', borderBottom: activeTab === 'whatsapp' ? 'none' : '' }}
            onClick={() => setActiveTab('whatsapp')}
          >
            <Tags size={18} /> Mensagens WhatsApp
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'liturgia' && <LiturgiaModelosTab />}
          {activeTab === 'liturgia_tipos' && <TiposLiturgiaTab />}
          {activeTab === 'eventos' && <TiposEventoTab />}
          {activeTab === 'funcoes' && <FuncoesTab />}
          {activeTab === 'necessidades' && (
            <div style={{ marginTop: '-var(--space-6)' }}>
              <NecessidadesTab />
            </div>
          )}
          {activeTab === 'whatsapp' && <MensagensTab />}
        </div>

      </div>
    </>
  );
}
