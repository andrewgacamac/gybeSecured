import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient, getSupabaseAdmin } from '../_shared/supabase.ts';
import { handleCors, withCors } from '../_shared/cors.ts';

console.log("Email Sender: Starting (Secure Manual Auth)...");

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';

// Use shared admin helper
const supabaseAdmin = getSupabaseAdmin();

serve(async (req) => {
    // CORS Manually (Inline) - Wait, using shared cors is better but let's keep inline for minimal diff impact if possible, 
    // BUT shared cors is safer. Let's use shared cors.
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    try {
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

        console.log(`Email request allocated to user: ${user.email}`);
        // console.log('Skipping Auth Check for Debugging');
        // const user = { email: 'debug@test.com' };

        const payload = await req.json();
        console.log('Payload:', Object.keys(payload));

        let leadId: string | undefined;

        if (payload.lead_id) {
            leadId = payload.lead_id;
        } else if (payload.record?.id) {
            leadId = payload.record.id;
            // Webhook check? Skip for simplicity in debug phase, just send if invoked.
        }

        if (!leadId) {
            throw new Error('Missing lead_id');
        }

        console.log(`Fetching Lead: ${leadId}`);
        const { data: lead, error: leadError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (leadError || !lead) throw new Error(`Lead fetch failed: ${leadError?.message}`);

        console.log(`Fetching Photos...`);
        const { data: photos } = await supabaseAdmin
            .from('photos')
            .select('*')
            .eq('lead_id', leadId);

        // Generate URLs
        let originalUrl = '';
        let processedUrl = '';

        if (photos && photos.length > 0) {
            const p = photos[0]; // Just grab first one
            if (p.original_path) {
                const { data } = await supabaseAdmin.storage.from('raw_uploads').createSignedUrl(p.original_path, 604800);
                if (data) originalUrl = data.signedUrl;
            }
            if (p.processed_path) {
                const { data } = await supabaseAdmin.storage.from('processed_images').createSignedUrl(p.processed_path, 604800);
                if (data) processedUrl = data.signedUrl;
            }
        }

        // HTML Content
        const firstName = lead.first_name || 'Valued Customer';
        const estimateText = lead.final_estimate || lead.ai_estimate || 'Pending Estimate';
        // Simple line break replacement
        const formattedEstimate = estimateText.replace(/\n/g, '<br>');

        const htmlContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2>Your YardGuard Quote is Ready!</h2>
            <p>Hi ${firstName},</p>
            <p>Great news! Your artificial turf transformation proposal is ready.</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3>Estimated Quote</h3>
                <p style="white-space: pre-wrap;">${formattedEstimate}</p>
            </div>

            ${processedUrl ? `
            <div style="margin: 20px 0;">
                <h3>Your New Yard Design</h3>
                <img src="${processedUrl}" style="width: 100%; border-radius: 8px; border: 1px solid #ddd;" alt="AI Design">
                <br>
                <small><a href="${processedUrl}">View Full Size</a></small>
            </div>
            ` : '<p><i>(No design available)</i></p>'}


            <p>Best,<br>The YardGuard Team</p>
        </div>
    `;

        console.log(`Sending Email to ${lead.email}`);
        if (!RESEND_API_KEY) throw new Error("No RESEND_API_KEY");

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: lead.email,
                subject: `Your YardGuard Quote is Ready! 🌿`,
                html: htmlContent
            })
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Resend Error: ${res.status} ${txt}`);
        }

        const emailRes = await res.json();
        console.log('Success:', emailRes.id);

        // Update DB status
        await supabaseAdmin.from('leads').update({ status: 'COMPLETED' }).eq('id', leadId);

        return withCors(new Response(JSON.stringify({
            success: true,
            message: "Email Sent!",
            id: emailRes.id
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        }));

    } catch (e) {
        const err = e as Error;
        console.error("Function Crash:", err.stack || err);
        return withCors(new Response(JSON.stringify({
            success: false,
            error: err.message || String(err)
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        }));
    }
});
