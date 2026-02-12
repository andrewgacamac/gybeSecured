import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

let supabaseAdmin: SupabaseClient | null = null;

/**
 * Get Supabase admin client (uses service role key)
 * This client bypasses RLS - use for internal operations
 */
export function getSupabaseAdmin(): SupabaseClient {
    if (supabaseAdmin) return supabaseAdmin;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return supabaseAdmin;
}

/**
 * Get Supabase client for a specific user (respects RLS)
 */
export function getSupabaseClient(authHeader: string): SupabaseClient {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !anonKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }

    return createClient(supabaseUrl, anonKey, {
        global: {
            headers: { Authorization: authHeader },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
