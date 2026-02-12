import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { handleCors, withCors } from '../_shared/cors.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';

serve(async (req: Request) => {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
        console.log('Admin Regenerate Images Invoked');

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

        const { lead_id, prompt } = await req.json();
        if (!lead_id) throw new Error('Missing lead_id');

        console.log(`Regenerate requested for lead ${lead_id} by user: ${user.email}. Prompt: ${prompt || 'Default'}`);

        // 2. Trigger AI Orchestrator (Using Service Key)
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceKey || !supabaseUrl) {
            throw new Error('Missing Server Configuration');
        }

        const funcUrl = `${supabaseUrl}/functions/v1/ai-orchestrator`;

        console.log(`Triggering AI Orchestrator at ${funcUrl}...`);

        const response = await fetch(funcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceKey}`
            },
            body: JSON.stringify({
                lead_id: lead_id,
                force: true,
                prompt: prompt
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('AI Orchestrator Execution Failed:', errText);
            throw new Error(`AI Orchestrator failed: ${response.status} ${errText}`);
        }

        const resultJson = await response.json();
        console.log('AI Orchestrator Response:', resultJson);

        return withCors(new Response(JSON.stringify({
            success: true,
            message: `Image regeneration started successfully.`,
            details: resultJson
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        }));

    } catch (error) {
        console.error('Regenerate Failed:', error);
        return withCors(new Response(JSON.stringify({
            success: false,
            error: String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }));
    }
});
