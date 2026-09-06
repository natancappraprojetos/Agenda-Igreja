import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';

export function useUnreadNotificationsCount() {
  const [data, setData] = useState({ count: 0, hasUrgent: false });
  const { roles } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    
    async function fetchCount() {
      let totalCount = 0;
      let hasUrgent = false;

      // 1. Static notifications (is_read = false)
      const { data: staticNotifs, count: staticCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('is_read', false);
      
      if (staticCount) totalCount += staticCount;
      if (staticNotifs) {
        if (staticNotifs.some(n => n.title?.toLowerCase().includes('batismo') || n.message?.toLowerCase().includes('batismo'))) {
          hasUrgent = true;
        }
      }

      // 2. Dynamic notifications (pendencies)
      if (roles.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const { data: pendencies } = await supabase
          .from('event_pendencies')
          .select('*')
          .gte('date', today);

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
              totalCount += 1; // Each pendency counts as 1 notification
              if (event.event_type?.toLowerCase().includes('batismo') || event.title?.toLowerCase().includes('batismo')) {
                hasUrgent = true;
              }
            }
          });
        }
      }

      if (isMounted) {
        setData({ count: totalCount, hasUrgent });
      }
    }

    fetchCount();

    return () => {
      isMounted = false;
    };
  }, [roles]);

  return data;
}
