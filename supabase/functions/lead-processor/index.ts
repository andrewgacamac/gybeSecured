import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createLogger } from '../_shared/logging.ts';
import { errorToResponse, ValidationError } from '../_shared/errors.ts';
import { rateLimiter } from '../_shared/rate-limit.ts';
import { getSupabaseAdmin } from '../_shared/supabase.ts';
import { corsHeaders, handleCors, withCors } from '../_shared/cors.ts';
import { WebhookPayload, Lead, Photo } from '../_shared/types.ts';

serve(async (req: Request) => {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const logger = createLogger(req);
    logger.info('lead-processor invoked');

    // Security Check: Require Service Role Key (from DB Webhook)
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!authHeader || !serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
        logger.error('Unauthorized access attempt');
        return withCors(new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        }));
    }

    try {
        // Parse webhook payload
        const payload: WebhookPayload = await req.json();
        logger.info('Webhook payload received', { type: payload.type, table: payload.table });

        // Only process INSERT on photos table
        if (payload.type !== 'INSERT' || payload.table !== 'photos') {
            logger.info('Ignoring non-photo-insert event');
            return withCors(new Response(JSON.stringify({ ignored: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }));
        }

        const photo = payload.record as Photo;
        const supabase = getSupabaseAdmin();

        // Fetch the associated lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', photo.lead_id)
            .single();

        if (leadError || !lead) {
            logger.error('Lead not found', undefined, { lead_id: photo.lead_id });
            throw new ValidationError('Lead not found');
        }

        logger.info('Lead fetched', { lead_id: lead.id, status: lead.status });

        // Only process if lead is in a valid state for new data
        const allowedStatuses = ['NEW', 'PROCESSING', 'NEEDS_REVIEW'];
        if (!allowedStatuses.includes(lead.status)) {
            logger.info('Lead final/rejected, skipping', { status: lead.status });
            return withCors(new Response(JSON.stringify({ skipped: true, reason: `Status ${lead.status} ignores new data` }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            }));
        }

        // Rate limit check (10 leads per hour per email)
        await rateLimiter.enforce(lead.email, 10, 3600);
        logger.info('Rate limit passed', { email: lead.email });

        // Update lead status to PROCESSING (if not already)
        if (lead.status !== 'PROCESSING') {
            const { error: updateError } = await supabase
                .from('leads')
                .update({ status: 'PROCESSING' })
                .eq('id', lead.id);

            if (updateError) {
                logger.error('Failed to update lead status', new Error(updateError.message));
                throw new Error('Failed to update lead status');
            }
            logger.info('Lead status updated to PROCESSING', { lead_id: lead.id });
        }

        // Invoke ai-orchestrator asynchronously
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        // Fire and forget - don't await
        fetch(`${supabaseUrl}/functions/v1/ai-orchestrator`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ lead_id: lead.id }),
        }).catch(err => {
            logger.error('Failed to invoke ai-orchestrator', err);
        });

        logger.info('ai-orchestrator invoked', { lead_id: lead.id });

        return withCors(new Response(JSON.stringify({
            success: true,
            lead_id: lead.id,
            requestId: logger.getRequestId(),
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

    } catch (error) {
        logger.error('lead-processor error', error as Error);
        return withCors(errorToResponse(error as Error, logger.getRequestId()));
    }
});
