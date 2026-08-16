import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the Service Role key
// IMPORTANT: This client bypasses RLS. Never expose this to the client-side.
// Only use this in trusted server environments (API routes, Server Actions).
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
