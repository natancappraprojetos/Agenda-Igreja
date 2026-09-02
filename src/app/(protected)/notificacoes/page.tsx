'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/layout/Header';
import { Bell, CheckCircle, Info, AlertTriangle, Calendar, Users } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  event_id: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificacoesPage() {
  const supabase = createClient();
  const { addToast } = useToast();
  const { roles, user } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    let allNotifications: Notification[] = [];

    // 1. Fetch from notifications table (static notifications)
    const { data: staticData } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (staticData) {
      allNotifications = [...(staticData as Notification[])];
    }

    // 2. Fetch from event_pendencies to generate dynamic notifications based on user roles
    if (roles.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const { data: pendencies } = await supabase
        .from('event_pendencies')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true });

      if (pendencies) {
        pendencies.forEach(event => {
          let missingRoles = [];

          if (roles.includes('sonoplastia') && event.has_sound === false) {
            missingRoles.push('Sonoplastia');
          }
          if (roles.includes('diacono') && event.has_deaconry === false) {
            missingRoles.push('Diaconato');
          }
          if (roles.includes('musica') && event.has_worship_leader === false) {
            if (event.event_type && event.event_type.toLowerCase().includes('culto')) {
              missingRoles.push('Louvor/Música');
            }
          }
          if (roles.includes('anciao') && event.has_preacher === false) {
            missingRoles.push('Pregador(a)');
          }

          if (missingRoles.length > 0) {
            const [year, month, day] = event.date.split('-');
            const eventDateStr = `${day}/${month}/${year}`;
            allNotifications.push({
              id: `pendency-${event.event_id}-${missingRoles.join('-')}`,
              type: 'pending_scale',
              title: `Escala Pendente - ${event.event_type}`,
              message: `O evento do dia ${eventDateStr} (${event.start_time.substring(0,5)}) precisa de pessoas para: ${missingRoles.join(', ')}. Acesse "Escalas" para definir.`,
              event_id: event.event_id,
              is_read: false, // Pendências dinâmicas sempre aparecem como não lidas até serem resolvidas
              created_at: `${event.date}T12:00:00Z` // Usa a data do evento para ordenação
            });
          }
        });
      }
    }

    // Ordenar todas juntas (mais recentes primeiro)
    allNotifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setNotifications(allNotifications);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    
    const { error } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      addToast({ type: 'success', title: 'Todas as notificações marcadas como lidas' });
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'schedule': return <Calendar size={20} color="var(--primary)" />;
      case 'conflict': return <AlertTriangle size={20} color="var(--danger)" />;
      case 'change': return <Info size={20} color="var(--warning)" />;
      case 'pending_scale': return <Users size={20} color="var(--danger)" />;
      default: return <Bell size={20} color="var(--text-secondary)" />;
    }
  };

  return (
    <>
      <Header title="Notificações" onMenuToggle={() => {}} />
      <div className="app-content">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '1.5rem' }}>Suas Notificações</h2>
            <button className="btn btn-ghost" onClick={markAllAsRead} disabled={loading || notifications.every(n => n.is_read)}>
              <CheckCircle size={18} /> Marcar todas como lidas
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <div className="spinner" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="empty-state">
                <Bell size={48} color="var(--border-color)" style={{ marginBottom: 'var(--space-4)' }} />
                <div className="empty-state-title">Nenhuma notificação</div>
                <div className="empty-state-desc">Você está em dia com todos os seus avisos.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    style={{ 
                      padding: 'var(--space-4)', 
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      gap: 'var(--space-4)',
                      backgroundColor: n.is_read ? 'transparent' : 'rgba(79, 70, 229, 0.05)',
                      transition: 'background-color var(--transition-base)'
                    }}
                  >
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      backgroundColor: 'var(--bg-secondary)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {getIconForType(n.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <div style={{ fontWeight: n.is_read ? 500 : 700, color: 'var(--text)' }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                          {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                      {!n.is_read && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                          {n.type === 'pending_scale' ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 600 }}>
                              Pendência de Escala (Resolva para limpar esta notificação)
                            </span>
                          ) : (
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--primary)' }}
                              onClick={() => markAsRead(n.id)}
                            >
                              Marcar como lida
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: 'var(--space-8)' }}>
            <h3>Integração com WhatsApp</h3>
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
              Em breve, você poderá conectar seu WhatsApp via QR Code para que as notificações sejam disparadas automaticamente para os membros da escala!
            </p>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <button className="btn btn-secondary" disabled>Conectar Dispositivo (Em Breve)</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
