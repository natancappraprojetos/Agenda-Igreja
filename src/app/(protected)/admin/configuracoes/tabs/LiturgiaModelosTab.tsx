'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import { useToast } from '@/lib/hooks/useToast';

interface LiturgyTemplate {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export default function LiturgiaModelosTab() {
  const router = useRouter();
  const [templates, setTemplates] = useState<LiturgyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LiturgyTemplate | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    const { data, error } = await supabase
      .from('liturgy_templates')
      .select('*')
      .order('name');
      
    if (error) {
      addToast({ type: 'error', title: 'Erro ao carregar modelos' });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  }

  const openModal = (template?: LiturgyTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setName(template.name);
      setDescription(template.description || '');
    } else {
      setEditingTemplate(null);
      setName('');
      setDescription('');
    }
    setIsModalOpen(true);
  };

  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (editingTemplate) {
      const { error } = await supabase
        .from('liturgy_templates')
        .update({ name, description })
        .eq('id', editingTemplate.id);
      
      if (error) addToast({ type: 'error', title: 'Erro ao salvar' });
      else addToast({ type: 'success', title: 'Modelo atualizado' });
    } else {
      const { error } = await supabase
        .from('liturgy_templates')
        .insert({ name, description });
      
      if (error) addToast({ type: 'error', title: 'Erro ao criar' });
      else addToast({ type: 'success', title: 'Modelo criado' });
    }
    
    setIsModalOpen(false);
    fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Deseja excluir este modelo?')) return;
    
    const { error } = await supabase
      .from('liturgy_templates')
      .delete()
      .eq('id', id);
      
    if (error) addToast({ type: 'error', title: 'Erro ao excluir' });
    else {
      addToast({ type: 'success', title: 'Modelo excluído' });
      fetchTemplates();
    }
  };

  return (
    <>
      <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>
          Crie modelos padronizados de liturgia para reaproveitar ao criar eventos.
        </p>
        <button className="btn btn-primary" onClick={() => openModal()}>
          Novo Modelo
        </button>
      </div>

        {loading ? (
          <div className="loading-page"><div className="spinner" /></div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome do Modelo</th>
                  <th>Descrição</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(tpl => (
                  <tr key={tpl.id}>
                    <td style={{ fontWeight: 600 }}>{tpl.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{tpl.description || '-'}</td>
                    <td style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '4px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => router.push(`/admin/configuracoes/liturgia/${tpl.id}`)}>Montar Culto</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => openModal(tpl)}>📝</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => deleteTemplate(tpl.id)}>❌</button>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-tertiary)' }}>
                      Nenhum modelo cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">{editingTemplate ? 'Editar Modelo' : 'Novo Modelo'}</h2>
            <form onSubmit={saveTemplate}>
              <div className="form-group">
                <label className="form-label">Nome do Modelo *</label>
                <input 
                  type="text" 
                  className="input" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  placeholder="Ex: Culto de Domingo Padrão"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Descrição</label>
                <textarea 
                  className="input" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  rows={3}
                  placeholder="Descreva o objetivo deste modelo..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
