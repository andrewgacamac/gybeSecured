import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getSupabaseAdmin } from '../_shared/supabase.ts';
import { corsHeaders, handleCors, withCors } from '../_shared/cors.ts';

serve(async (req: Request) => {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const startTime = Date.now();
    const checks: Record<string, { status: 'ok' | 'error'; latency?: number; error?: string }> = {};

    // Check database connection
    try {
        const dbStart = Date.now();
        const supabase = getSupabaseAdmin();
        await supabase.from('leads').select('id').limit(1);
        checks.database = { status: 'ok', latency: Date.now() - dbStart };
    } catch (error) {
        checks.database = { status: 'error', error: (error as Error).message };
    }

    // Check environment variables
    const requiredEnvVars = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_ANON_KEY',
    ];

    const missingEnvVars = requiredEnvVars.filter(v => !Deno.env.get(v));
    checks.environment = missingEnvVars.length === 0
        ? { status: 'ok' }
        : { status: 'error', error: `Missing: ${missingEnvVars.join(', ')}` };

    // Overall status
    const allOk = Object.values(checks).every(c => c.status === 'ok');
    const totalLatency = Date.now() - startTime;

    return withCors(new Response(JSON.stringify({
        status: allOk ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        latency: totalLatency,
        checks,
    }), {
        status: allOk ? 200 : 503,
        headers: { 'Content-Type': 'application/json' },
    }));
});
