
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors, withCors } from '../_shared/cors.ts';
import { getSupabaseClient, getSupabaseAdmin } from '../_shared/supabase.ts';
import { BUCKETS } from '../_shared/storage.ts';

serve(async (req: Request) => {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        console.log('Admin Delete Lead Invoked');

        // 1. Verify Authentication
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization header');
        }

        const supabaseUserClient = getSupabaseClient(authHeader);
        const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();

        if (authError || !user) {
            console.error('Auth check failed:', authError);
            return withCors(new Response(JSON.stringify({ error: 'Unauthorized: Invalid Session' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            }));
        }

        const { lead_id } = await req.json();
        if (!lead_id) throw new Error('Missing lead_id');

        console.log(`Delete requested for lead ${lead_id} by user: ${user.email}`);

        // 2. Perform Deletion (Using Admin Client to bypass RLS)
        const supabaseAdmin = getSupabaseAdmin();

        // A. Fetch photos to clean up Storage
        const { data: photos, error: photoError } = await supabaseAdmin
            .from('photos')
            .select('original_path, processed_path')
            .eq('lead_id', lead_id);

        if (photoError) console.error('Error fetching photos for cleanup:', photoError);

        // B. Delete Files from Storage
        if (photos && photos.length > 0) {
            const rawPaths = photos.map(p => p.original_path).filter(p => p) as string[];
            const processedPaths = photos.map(p => p.processed_path).filter(p => p) as string[];

            if (rawPaths.length > 0) {
                const { error: rmRaw } = await supabaseAdmin.storage.from(BUCKETS.RAW_UPLOADS).remove(rawPaths);
                if (rmRaw) console.error('Error removing raw files:', rmRaw);
            }
            if (processedPaths.length > 0) {
                const { error: rmProc } = await supabaseAdmin.storage.from(BUCKETS.PROCESSED_IMAGES).remove(processedPaths);
                if (rmProc) console.error('Error removing processed files:', rmProc);
            }
        }

        // C. Delete Lead Record
        // (Assuming CASCADE delete on photos table, otherwise we must delete photos records first)
        // I'll delete photos records explicitly just in case.
        await supabaseAdmin.from('photos').delete().eq('lead_id', lead_id);

        const { error: deleteError } = await supabaseAdmin
            .from('leads')
            .delete()
            .eq('id', lead_id);

        if (deleteError) {
            console.error('Delete Error:', deleteError);
            throw deleteError;
        }

        console.log(`Deleted lead ${lead_id}`);

        return withCors(new Response(JSON.stringify({
            success: true,
            message: `Lead deleted successfully.`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }));

    } catch (error) {
        console.error('Delete Failed:', error);
        return withCors(new Response(JSON.stringify({
            success: false,
            error: String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }));
    }
});
