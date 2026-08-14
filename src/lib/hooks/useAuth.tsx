'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Person, AppRoleName, AuthContextType } from '@/lib/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [roles, setRoles] = useState<AppRoleName[]>([]);
  const [maxRoleLevel, setMaxRoleLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchUserData = useCallback(async (authUserId: string) => {
    try {
      // Fetch user with person and roles
      const { data: userData } = await supabase
        .from('users')
        .select(`
          *,
          person:people(*),
          app_roles:user_app_roles(
            *,
            app_role:app_roles(*)
          )
        `)
        .eq('id', authUserId)
        .single();

      if (userData) {
        setUser(userData as unknown as User);
        setPerson(userData.person as unknown as Person);
        
        const userRoles = (userData.app_roles as unknown as Array<{ app_role: { name: AppRoleName; level: number } }>)
          ?.map(r => r.app_role?.name)
          .filter(Boolean) || [];
        setRoles(userRoles);
        
        const maxLevel = (userData.app_roles as unknown as Array<{ app_role: { level: number } }>)
          ?.reduce((max: number, r: { app_role: { level: number } }) => Math.max(max, r.app_role?.level || 0), 0) || 0;
        setMaxRoleLevel(maxLevel);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [supabase]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          await fetchUserData(authUser.id);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setPerson(null);
        setRoles([]);
        setMaxRoleLevel(0);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPerson(null);
    setRoles([]);
    setMaxRoleLevel(0);
  };

  return (
    <AuthContext.Provider value={{
      user,
      person,
      roles,
      maxRoleLevel,
      isLoading,
      isAdmin: roles.includes('admin'),
      isLeadership: maxRoleLevel >= 3,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
