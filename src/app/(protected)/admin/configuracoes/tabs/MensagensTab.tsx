'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/hooks/useToast';
import { Save } from 'lucide-react';

export default function MensagensTab() {
  const [selectedCategory, setSelectedCategory] = useState('whatsapp_template_default');
  const [template, setTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const { addToast } = useToast();

  useEffect(() => {
    fetchTemplate(selectedCategory);
  }, [selectedCategory]);

  const fetchTemplate = async (category: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', category)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // not found
          console.error(error);
        }
        // Use fallbacks if not found
        if (category === 'whatsapp_template_pregador') {
          setTemplate('Olá *{{nome}}*! A Paz do Senhor!\n\nEste é um lembrete automático. Você está escalado(a) para trazer a mensagem da Palavra como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.\n\nOre por este momento! Deus te abençoe! 🙏');
        } else if (category === 'whatsapp_template_musica') {
          setTemplate('Olá *{{nome}}*! A Paz do Senhor!\n\nLembrete da escala de Louvor! Você está escalado(a) como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.\n\nNão esqueça de separar os hinos com antecedência! 🎵');
        } else if (category === 'whatsapp_template_sonoplastia') {
          setTemplate('Olá *{{nome}}*! A Paz do Senhor!\n\nLembrete da equipe técnica! Você está escalado(a) na *{{funcao}}* para o *{{evento}}* do dia *{{data}}* às *{{horario}}*.\n\nPor favor, chegue com 30 minutos de antecedência para ligar os equipamentos e testar os microfones! 🎛️');
        } else if (category === 'whatsapp_template_diaconato') {
          setTemplate('Olá *{{nome}}*! A Paz do Senhor!\n\nLembrete da escala do Diaconato! Você está escalado(a) como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.\n\nSe houver batismo neste dia, lembre-se de verificar as toalhas e a água! Que Deus abençoe seu serviço! 🛡️');
        } else {
          setTemplate('Olá *{{nome}}*! A Paz do Senhor!\n\nEste é um lembrete automático da secretaria da igreja.\nVocê está escalado(a) como *{{funcao}}* no *{{evento}}* do dia *{{data}}* às *{{horario}}*.\n\nQue Deus abençoe seu ministério! 🙏');
        }
        return;
      }
      
      if (data) {
        setTemplate(data.value);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template.trim()) {
      addToast({ type: 'error', title: 'O template não pode ser vazio' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: selectedCategory,
          value: template,
          description: `Template de mensagem para ${selectedCategory}`
        });

      if (error) throw error;
      
      addToast({ type: 'success', title: 'Template de WhatsApp salvo com sucesso!' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Erro ao salvar', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const insertVariable = (variable: string) => {
    setTemplate(prev => prev + ` {{${variable}}}`);
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="card" style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Template de Escala do WhatsApp</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Configure a mensagem que o robô envia automaticamente para os escalados da semana.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <Save size={18} />
          {saving ? 'Salvando...' : 'Salvar Template'}
        </button>
      </div>

      <div style={{ marginBottom: 'var(--space-6)', backgroundColor: 'var(--surface-hover)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
        <label className="form-label">Selecione para qual grupo deseja editar a mensagem:</label>
        <select 
          className="form-input" 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="whatsapp_template_default">Geral / Padrão (Para quem não tem categoria)</option>
          <option value="whatsapp_template_pregador">Pregadores (Pregação / Palavra)</option>
          <option value="whatsapp_template_musica">Ministério da Música (Cantores / Banda)</option>
          <option value="whatsapp_template_sonoplastia">Sonoplastia / Multimídia</option>
          <option value="whatsapp_template_diaconato">Diaconato / Recepção</option>
        </select>
      </div>

      <div style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Variáveis Disponíveis (clique para inserir):</span>
        <button className="badge badge-info" onClick={() => insertVariable('nome')} style={{ cursor: 'pointer', border: 'none' }}>nome</button>
        <button className="badge badge-info" onClick={() => insertVariable('evento')} style={{ cursor: 'pointer', border: 'none' }}>evento</button>
        <button className="badge badge-info" onClick={() => insertVariable('data')} style={{ cursor: 'pointer', border: 'none' }}>data</button>
        <button className="badge badge-info" onClick={() => insertVariable('horario')} style={{ cursor: 'pointer', border: 'none' }}>horario</button>
        <button className="badge badge-info" onClick={() => insertVariable('funcao')} style={{ cursor: 'pointer', border: 'none' }}>funcao</button>
      </div>

      <div className="form-group">
        <textarea
          className="form-input"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          style={{ 
            minHeight: '200px', 
            fontFamily: 'monospace', 
            padding: 'var(--space-3)',
            lineHeight: '1.5'
          }}
          placeholder="Digite a mensagem do WhatsApp aqui..."
        />
        <div style={{ marginTop: 'var(--space-2)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong>Dica do WhatsApp:</strong> Use asteriscos para *negrito* e underlines para _itálico_.
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-6)', backgroundColor: 'var(--background-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
        <h3 style={{ fontSize: '1rem', marginTop: 0, marginBottom: 'var(--space-2)' }}>Exemplo de Pré-visualização:</h3>
        <p style={{ whiteSpace: 'pre-wrap', margin: 0, color: 'var(--text)' }}>
          {template
            .replace(/\{\{nome\}\}/g, 'Irmão João')
            .replace(/\{\{evento\}\}/g, 'Culto de Quarta')
            .replace(/\{\{data\}\}/g, '20/08/2026')
            .replace(/\{\{horario\}\}/g, '19:30:00')
            .replace(/\{\{funcao\}\}/g, 'Pregador(a)')
          }
        </p>
      </div>
    </div>
  );
}
