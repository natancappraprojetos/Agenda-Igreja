'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireLeadership?: boolean;
  requireTeam?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireLeadership = false,
  requireTeam = false
}: ProtectedRouteProps) {
  const { isAdmin, isLeadership, roles, isLoading } = useAuth();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    let isAuthorized = false;

    if (requireAdmin && isAdmin) {
      isAuthorized = true;
    } else if (requireLeadership && (isAdmin || isLeadership)) {
      isAuthorized = true;
    } else if (requireTeam) {
      const hasTeam = roles.some(r => ['sonoplastia', 'musica', 'diacono', 'anciao'].includes(r));
      if (isAdmin || isLeadership || hasTeam) {
        isAuthorized = true;
      }
    } else if (!requireAdmin && !requireLeadership && !requireTeam) {
      // Se não exige nada específico, apenas estar logado serve (presumindo que app inteiro já exige login)
      isAuthorized = true;
    }

    if (!isAuthorized) {
      router.replace('/');
    } else {
      setAuthorized(true);
    }
  }, [isLoading, isAdmin, isLeadership, roles, requireAdmin, requireLeadership, requireTeam, router]);

  if (!authorized) {
    return <div className="loading-page"><div className="spinner spinner-lg" /></div>;
  }

  return <>{children}</>;
}
