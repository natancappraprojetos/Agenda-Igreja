import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kriynwzshkzaqjlnoqwf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const usersToCreate = [
  { name: 'Denis', email: 'denis@santoafonso.com', role: 'sonoplastia' },
  { name: 'William', email: 'william@santoafonso.com', role: 'musica' },
  { name: 'Natan', email: 'natan@santoafonso.com', role: 'anciao' },
  { name: 'Adalmir', email: 'adalmir@santoafonso.com', role: 'anciao' },
  { name: 'Mário', email: 'mario@santoafonso.com', role: 'anciao' },
  { name: 'Isabel Carol', email: 'isabelcarol@santoafonso.com', role: 'anciao' },
  { name: 'Adair', email: 'adair@santoafonso.com', role: 'anciao' },
  { name: 'Alison', email: 'alison@santoafonso.com', role: 'anciao' },
  { name: 'Felipe', email: 'felipe@santoafonso.com', role: 'diacono' }
];

async function main() {
  const defaultPassword = 'Agenda@123';

  // Fetch app roles
  const { data: appRoles, error: rolesErr } = await supabase.from('app_roles').select('*');
  if (rolesErr) throw rolesErr;

  for (const u of usersToCreate) {
    console.log(`Processing user: ${u.name}`);
    
    // Check if person exists
    let { data: people, error: pErr } = await supabase.from('people').select('*').ilike('name', `%${u.name}%`);
    if (pErr) throw pErr;
    
    let personId = null;
    if (people && people.length > 0) {
      personId = people[0].id;
      console.log(`  Found existing person: ${people[0].name}`);
    } else {
      console.log(`  Creating new person: ${u.name}`);
      const { data: newPerson, error: insErr } = await supabase.from('people').insert({
        name: u.name,
        whatsapp: ''
      }).select().single();
      if (insErr) throw insErr;
      personId = newPerson.id;
    }

    // Check if auth user exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    let authUserId = null;
    let authUser = existingUser?.users?.find(x => x.email === u.email);
    
    if (authUser) {
      console.log(`  Auth user already exists: ${authUser.email}`);
      authUserId = authUser.id;
    } else {
      console.log(`  Creating auth user: ${u.email}`);
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: defaultPassword,
        email_confirm: true
      });
      if (authErr) throw authErr;
      authUserId = authData.user.id;
    }

    // Check if public.users exists
    const { data: pubUser } = await supabase.from('users').select('*').eq('id', authUserId).maybeSingle();
    if (!pubUser) {
      console.log(`  Creating public user record`);
      const { error: puErr } = await supabase.from('users').insert({
        id: authUserId,
        person_id: personId
      });
      if (puErr) throw puErr;
    } else if (!pubUser.person_id) {
        console.log(`  Updating public user person_id`);
        await supabase.from('users').update({ person_id: personId }).eq('id', authUserId);
    }

    // Assign app_role
    const roleId = appRoles.find(r => r.name === u.role)?.id;
    if (!roleId) {
      console.error(`  Role not found: ${u.role}`);
      continue;
    }

    const { data: existingRole } = await supabase.from('user_app_roles').select('*').eq('user_id', authUserId).maybeSingle();
    if (!existingRole) {
      console.log(`  Assigning role: ${u.role}`);
      const { error: urErr } = await supabase.from('user_app_roles').insert({
        user_id: authUserId,
        app_role_id: roleId
      });
      if (urErr) throw urErr;
    } else {
      console.log(`  User already has a role assigned.`);
      // Update role if different?
      if (existingRole.app_role_id !== roleId) {
        console.log(`  Updating role to: ${u.role}`);
        const { error: urUpErr } = await supabase.from('user_app_roles').update({ app_role_id: roleId }).eq('user_id', authUserId);
        if (urUpErr) throw urUpErr;
      }
    }
  }

  console.log("Done!");
}

main().catch(console.error);
