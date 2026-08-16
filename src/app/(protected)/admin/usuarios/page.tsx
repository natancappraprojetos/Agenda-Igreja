import React from 'react';
import { supabaseAdmin } from '@/lib/supabase/admin';
import UsersClient from './UsersClient';

export default async function UsuariosPage() {
  // Fetch from auth.users (requires service_role)
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  
  // Fetch from public.users
  const { data: publicUsers } = await supabaseAdmin
    .from('users')
    .select(`
      id,
      person:people(id, name),
      roles:user_app_roles(
        app_role:app_roles(id, name, description)
      )
    `);

  // Fetch app_roles to populate the dropdown
  const { data: appRoles } = await supabaseAdmin.from('app_roles').select('*').order('level', { ascending: false });

  const users = (authUsers?.users || []).map(authUser => {
    const pubUser = publicUsers?.find((pu: any) => pu.id === authUser.id);
    const personName = Array.isArray(pubUser?.person) ? (pubUser?.person as any)[0]?.name : (pubUser?.person as any)?.name;
    const personId = Array.isArray(pubUser?.person) ? (pubUser?.person as any)[0]?.id : (pubUser?.person as any)?.id;
    
    return {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.name || personName || 'Sem nome',
      person_id: personId || null,
      roles: pubUser?.roles?.map((r: any) => r.app_role) || []
    };
  });

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Gerenciar Acessos</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Controle quem pode fazer login no sistema.</p>
        </div>
      </header>

      <UsersClient initialUsers={users} appRoles={appRoles || []} />
    </div>
  );
}
