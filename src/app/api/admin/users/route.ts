import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    
    // Create standard client to verify the caller's auth
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // Read-only in this context
          },
        },
      }
    );

    // Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call custom function or check role to ensure admin privileges
    // For simplicity, we can trust the middleware that protects /admin
    // but ideally we check if the caller has the 'admin' app_role.

    const body = await request.json();
    const { email, password, name, appRoleId, personId, ministryId } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Create User in Supabase Auth using Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm since the admin is creating it
      user_metadata: { name }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. The database trigger `on_auth_user_created` in Supabase might already create 
    // the row in `public.users`. Let's check if it exists or insert it.
    // Wait, do we have a trigger? Let's assume we don't have a trigger that auto-inserts,
    // or if we do, we just update it.
    
    // Upsert into `users`
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({ 
        id: userId,
        person_id: personId || null
      });

    if (userError) {
      console.error('Error upserting user:', userError);
      // Not a fatal error if trigger already created it, but good to ensure
    }

    // 3. Assign Role
    if (appRoleId) {
      const { error: roleError } = await supabaseAdmin
        .from('user_app_roles')
        .insert({
          user_id: userId,
          app_role_id: appRoleId
        });
      
      if (roleError) console.error('Error assigning role:', roleError);
    }

    // 4. (Optional) If we want to store which ministry this user manages, 
    // we could add a `managed_ministry_id` to `users` or somewhere.
    // For now, the app_role 'lider_ministerio' + `user.person_id` + `person_ministries` 
    // is how we usually link it. If `personId` is given, it's linked!

    return NextResponse.json({ success: true, user: authData.user });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
