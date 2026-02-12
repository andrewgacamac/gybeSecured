
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createLogger } from '../_shared/logging.ts';
import { errorToResponse, ValidationError } from '../_shared/errors.ts';
import { getSupabaseAdmin } from '../_shared/supabase.ts';
import { downloadFile, uploadFile, BUCKETS } from '../_shared/storage.ts';
import { handleCors, withCors } from '../_shared/cors.ts';
import { Lead } from '../_shared/types.ts';
import { transformYardPhoto } from '../_shared/ai-visualizer.ts';
import { generateAIEstimate } from '../_shared/ai-estimator.ts';

serve(async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const logger = createLogger(req);
    logger.info('ai-orchestrator invoked');

    // Security Check: Require Service Role Key (Internal only)
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!authHeader || !serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
        logger.error('Unauthorized access attempt');
        return withCors(new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        }));
    }

    let lead_id: string | undefined;

    try {
        const payload = await req.json();
        lead_id = payload.lead_id;
        const forceRegenerate = payload.force === true;

        if (!lead_id) {
            throw new ValidationError('lead_id is required');
        }

        const supabase = getSupabaseAdmin();

        // Fetch lead
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', lead_id)
            .single();

        if (leadError || !lead) {
            throw new ValidationError('Lead not found');
        }

        logger.info('Processing lead', { lead_id, email: lead.email });

        // Fetch photos
        const { data: photos, error: photosError } = await supabase
            .from('photos')
            .select('*')
            .eq('lead_id', lead_id);

        if (photosError || !photos || photos.length === 0) {
            // Even if no photos, we can still estimate based on address?
            // But requirement implies photos needed for visualizer.
            // Let's proceed with estimate only if photos missing?
            // Actually, allow estimate generation even with 0 photos.
            logger.warn('No photos found for lead', { lead_id });
        } else {
            logger.info('Found photos to process', { count: photos.length });

            // Process each photo with AI Visualizer
            for (const photo of photos) {
                if (photo.processed_path && !forceRegenerate) {
                    logger.info('Photo already processed, skipping', { photo_id: photo.id });
                    continue;
                }

                logger.info('Processing photo', { photo_id: photo.id, path: photo.original_path });

                // Download original photo
                const imageBlob = await downloadFile(supabase, BUCKETS.RAW_UPLOADS, photo.original_path);
                if (!imageBlob) {
                    logger.error('Failed to download photo', undefined, { photo_id: photo.id });
                    continue;
                }

                // Context Logic for Visualizer
                let promptEnhancement = "fresh artificial turf";

                // 1. Use Custom Prompt if provided (Force Override)
                if (payload.prompt) {
                    promptEnhancement = payload.prompt;
                    logger.info('Using Custom Prompt override', { prompt: promptEnhancement });
                }
                // 2. Otherwise derive from Package Interest
                else if (lead.package_interest) {
                    const interest = lead.package_interest.toLowerCase();
                    if (interest.includes('pawguard')) {
                        promptEnhancement = "durable, pet-friendly artificial turf, short pile height, slightly reinforced";
                    } else if (interest.includes('augusta') || interest.includes('golf')) {
                        promptEnhancement = "professional putting green turf, very short and smooth, with a slightly longer fringe grass border";
                    } else if (interest.includes('premium')) {
                        promptEnhancement = "high-end luxury artificial turf, dense and lush, perfectly manicured";
                    } else if (interest.includes('easy')) {
                        promptEnhancement = "maintenance-free, natural-looking artificial turf, medium pile height";
                    }
                }

                // Transform with AI
                const result = await transformYardPhoto(imageBlob, photo.original_path, promptEnhancement);

                if (result.success && result.imageData) {
                    // Upload processed image
                    const processedPath = `processed/${lead_id}/${photo.id}.png`;
                    const uploadedPath = await uploadFile(
                        supabase,
                        BUCKETS.PROCESSED_IMAGES,
                        processedPath,
                        result.imageData.buffer,
                        result.mimeType || 'image/png'
                    );

                    if (uploadedPath) {
                        // Update photo record with processed path
                        await supabase
                            .from('photos')
                            .update({ processed_path: uploadedPath })
                            .eq('id', photo.id);

                        logger.info('Photo processed and uploaded', { photo_id: photo.id, path: uploadedPath });
                    }
                } else {
                    logger.warn('Photo processing failed', { photo_id: photo.id, error: result.error });
                }
            }
        }

        // Generate estimate using AI Estimator
        // Note: generateAIEstimate expects (leadData, imageUrl?)
        // We pass the lead object.
        const estimateResult = await generateAIEstimate(lead as Lead, undefined);
        const aiEstimate = estimateResult.estimateText || 'Estimate generation failed';

        // Update lead with estimate and status
        const { error: updateError } = await supabase
            .from('leads')
            .update({
                ai_estimate: aiEstimate,
                status: 'NEEDS_REVIEW',
            })
            .eq('id', lead_id);

        if (updateError) {
            logger.error('Failed to update lead', new Error(updateError.message));
            throw new Error(`Failed to update lead status: ${updateError.message} (${updateError.code})`);
        }

        logger.info('Lead processing complete', { lead_id, status: 'NEEDS_REVIEW' });

        return withCors(new Response(JSON.stringify({
            success: true,
            lead_id,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

    } catch (error) {
        logger.error('ai-orchestrator error', error as Error);

        // Update lead to FAILED status if we have the ID
        if (lead_id) {
            try {
                const supabase = getSupabaseAdmin();
                await supabase
                    .from('leads')
                    .update({ status: 'FAILED' })
                    .eq('id', lead_id);
            } catch (cleanupError) {
                logger.error('Failed to set status to FAILED', cleanupError as Error);
            }
        }

        return withCors(new Response(JSON.stringify({
            error: {
                message: (error as Error).message,
                stack: (error as Error).stack,
                code: 'DEBUG_INTERNAL_ERROR'
            }
        }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }
});
