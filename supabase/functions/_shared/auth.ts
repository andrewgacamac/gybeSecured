import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'reviewer';
  is_active: boolean;
}

/**
 * Verify the request has a valid authenticated user and return their info
 */
export async function verifyAuth(
  req: Request,
  supabaseClient: SupabaseClient
): Promise<{ user: AdminUser | null; error: string | null }> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify the JWT and get user
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

  if (authError || !user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  // Get admin user info with role
  const { data: adminUser, error: dbError } = await supabaseClient
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (dbError || !adminUser) {
    return { user: null, error: 'User not found or inactive' };
  }

  return { user: adminUser as AdminUser, error: null };
}

/**
 * Check if user has required role
 */
export function requireRole(user: AdminUser, requiredRole: 'admin' | 'reviewer'): boolean {
  if (requiredRole === 'reviewer') {
    return user.role === 'admin' || user.role === 'reviewer';
  }
  return user.role === 'admin';
}
