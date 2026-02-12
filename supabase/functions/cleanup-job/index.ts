import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createLogger } from '../_shared/logging.ts';
import { getSupabaseAdmin } from '../_shared/supabase.ts';
import { corsHeaders, handleCors, withCors } from '../_shared/cors.ts';

// Cleanup configuration
const REJECTED_RETENTION_DAYS = 30;  // Delete rejected leads after 30 days
const COMPLETED_RETENTION_DAYS = 90; // Archive completed leads after 90 days

serve(async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const logger = createLogger(req);
    logger.info('cleanup-job started');

    try {
        const supabase = getSupabaseAdmin();

        // Calculate cutoff dates
        const rejectedCutoff = new Date();
        rejectedCutoff.setDate(rejectedCutoff.getDate() - REJECTED_RETENTION_DAYS);

        const completedCutoff = new Date();
        completedCutoff.setDate(completedCutoff.getDate() - COMPLETED_RETENTION_DAYS);

        // Delete old rejected leads (cascade will delete photos and events)
        const { data: deletedRejected, error: deleteError } = await supabase
            .from('leads')
            .delete()
            .eq('status', 'REJECTED')
            .lt('updated_at', rejectedCutoff.toISOString())
            .select('id');

        if (deleteError) {
            logger.error('Failed to delete rejected leads', new Error(deleteError.message));
        } else {
            logger.info('Deleted rejected leads', { count: deletedRejected?.length || 0 });
        }

        // For completed leads, we could archive to a separate table
        // For now, just log how many would be archived
        const { count: completedCount } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'COMPLETED')
            .lt('updated_at', completedCutoff.toISOString());

        logger.info('Completed leads eligible for archiving', { count: completedCount });

        logger.info('cleanup-job completed');

        return withCors(new Response(JSON.stringify({
            success: true,
            deleted_rejected: deletedRejected?.length || 0,
            archive_eligible: completedCount || 0,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

    } catch (error) {
        logger.error('cleanup-job error', error as Error);
        return withCors(new Response(JSON.stringify({ error: 'Cleanup failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        }));
    }
});
