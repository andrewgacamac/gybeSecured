
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

console.log("Email Debug: Starting Resend Test...");

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';

serve(async (req) => {
    // CORS Manually
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        });
    }

    try {
        const data = await req.json();
        const { toEmail } = data;

        console.log(`Sending Email to: ${toEmail} from ${FROM_EMAIL}`);
        console.log(`API Key Exists? ${!!RESEND_API_KEY} (Len: ${RESEND_API_KEY?.length})`);

        if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY in Environment Secrets");

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: toEmail,
                subject: 'YardGuard Test Email',
                html: '<p>If you see this, Resend Works! Next step: Full Email Sender.</p>'
            })
        });

        const body = await res.json();

        if (!res.ok) {
            console.error("Resend API Failed:", res.status, body);
            throw new Error(`Resend Failed: ${res.status} ${JSON.stringify(body)}`);
        }

        return new Response(JSON.stringify({
            success: true,
            message: "Email Sent via Resend API!",
            id: body.id
        }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
        });

    } catch (e) {
        console.error("Function Error:", e);
        return new Response(JSON.stringify({
            success: false,
            error: String(e)
        }), {
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            status: 500
        });
    }
});
