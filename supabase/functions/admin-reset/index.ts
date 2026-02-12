import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors, withCors } from '../_shared/cors.ts';
import { getSupabaseClient, getSupabaseAdmin } from '../_shared/supabase.ts';

serve(async (req: Request) => {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        console.log('Admin Reset Invoked (REAL DELETE MODE)');

        // 1. Verify Authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        // Use standard client to verify user session
        const supabaseUserClient = getSupabaseClient(authHeader);
        const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();

        if (authError || !user) {
            console.error('Auth check failed:', authError);
            return withCors(new Response(JSON.stringify({ error: 'Unauthorized: Invalid Session' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            }));
        }

        console.log(`Reset requested by user: ${user.email}`);

        // 2. Perform Reset (Using Admin Client to bypass RLS)
        const supabaseAdmin = getSupabaseAdmin();

        // Delete ALL leads
        const { error, count } = await supabaseAdmin
            .from('leads')
            .delete({ count: 'exact' })
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

        if (error) {
            console.error('Delete Error:', error);
            throw error;
        }

        console.log(`Deleted ${count} rows.`);

        return withCors(new Response(JSON.stringify({
            success: true,
            message: `Deleted ${count} leads.`,
            count: count
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }));

    } catch (error) {
        console.error('Reset Failed:', error);
        return withCors(new Response(JSON.stringify({
            success: false,
            error: String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }));
    }
});
