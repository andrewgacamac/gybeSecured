import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createLogger } from '../_shared/logging.ts';
import { getSupabaseAdmin } from '../_shared/supabase.ts';
import { corsHeaders, handleCors, withCors } from '../_shared/cors.ts';
import { getFallbackEstimate, MAX_RETRY_ATTEMPTS } from '../_shared/fallback-templates.ts';

serve(async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const logger = createLogger(req);
    logger.info('retry-failed job started');

    try {
        const supabase = getSupabaseAdmin();

        // Find FAILED leads that haven't exceeded retry limit
        const { data: failedLeads, error: fetchError } = await supabase
            .from('leads')
            .select('*')
            .eq('status', 'FAILED')
            .lt('retry_count', MAX_RETRY_ATTEMPTS)
            .order('updated_at', { ascending: true })
            .limit(10); // Process 10 at a time

        if (fetchError) {
            logger.error('Failed to fetch failed leads', new Error(fetchError.message));
            throw fetchError;
        }

        logger.info('Found failed leads to retry', { count: failedLeads?.length || 0 });

        const results = {
            retried: 0,
            maxedOut: 0,
            errors: 0,
        };

        for (const lead of (failedLeads || [])) {
            try {
                // Increment retry count
                const newRetryCount = (lead.retry_count || 0) + 1;

                if (newRetryCount >= MAX_RETRY_ATTEMPTS) {
                    // Max retries reached - use fallback and move to NEEDS_REVIEW
                    logger.info('Max retries reached, using fallback', { lead_id: lead.id });

                    const fallbackEstimate = getFallbackEstimate(lead);

                    await supabase
                        .from('leads')
                        .update({
                            status: 'NEEDS_REVIEW',
                            retry_count: newRetryCount,
                            ai_estimate: fallbackEstimate,
                        })
                        .eq('id', lead.id);

                    results.maxedOut++;
                    continue;
                }

                // Update retry count and reset to PROCESSING
                await supabase
                    .from('leads')
                    .update({
                        status: 'PROCESSING',
                        retry_count: newRetryCount,
                    })
                    .eq('id', lead.id);

                // Invoke ai-orchestrator to retry
                const supabaseUrl = Deno.env.get('SUPABASE_URL');
                const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

                await fetch(`${supabaseUrl}/functions/v1/ai-orchestrator`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${serviceRoleKey}`,
                    },
                    body: JSON.stringify({ lead_id: lead.id }),
                });

                logger.info('Retry triggered', { lead_id: lead.id, attempt: newRetryCount });
                results.retried++;

            } catch (error) {
                logger.error('Failed to retry lead', error as Error, { lead_id: lead.id });
                results.errors++;
            }
        }

        logger.info('retry-failed job completed', results);

        return withCors(new Response(JSON.stringify({
            success: true,
            ...results,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

    } catch (error) {
        logger.error('retry-failed error', error as Error);
        return withCors(new Response(JSON.stringify({ error: 'Retry job failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        }));
    }
});
