'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { Tags, Wrench, BookOpen } from 'lucide-react';
import LiturgiaModelosTab from './tabs/LiturgiaModelosTab';

export default function ConfiguracoesGeraisPage() {
  const [activeTab, setActiveTab] = useState<'eventos' | 'funcoes' | 'liturgia'>('liturgia');

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
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'liturgia' && <LiturgiaModelosTab />}
          
          {activeTab === 'eventos' && (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h2 style={{ marginBottom: 'var(--space-2)' }}>Tipos de Eventos</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Aqui você poderá gerenciar Cultos, Reuniões, Treinamentos, etc.<br/>(Em breve)</p>
            </div>
          )}

          {activeTab === 'funcoes' && (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h2 style={{ marginBottom: 'var(--space-2)' }}>Funções da Escala</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Aqui você poderá cadastrar os cargos como Ancião, Diácono, Sonoplasta.<br/>(Em breve)</p>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
