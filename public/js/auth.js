
// yardguard-secure/public/js/auth.js
// Secure Authentication Module v2.1

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const config = window.YardGuardConfig;
if (!config) {
    console.error("Missing YardGuardConfig!");
    // Only redirect if not already on login page to avoid loop
    if (!window.location.href.includes('login.html')) {
        window.location.href = 'login.html?error=missing_config';
    }
}

// Export the client so other modules (like login.html) can use it
export const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

/**
 * Checks for a valid session. Redirects to login if missing.
 */
export async function checkAuth() {
    console.log("Checking authentication...");

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        console.warn("No active session. Redirecting to login.");
        if (!window.location.href.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return null; // Stop execution
    }

    // Check Admin Role
    const { data: adminUser, error: roleError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

    if (roleError || !adminUser || adminUser.role !== 'admin') {
        console.error("User authenticated but NOT an admin.", session.user.id);
        await supabase.auth.signOut();
        window.location.href = 'login.html?error=unauthorized';
        return null;
    }

    console.log("Authentication successful:", session.user.email);
    return session.user;
}

export async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

// Attach to window for legacy scripts if needed
window.checkAuth = checkAuth;
window.logout = logout;
window.supabase = supabase;
