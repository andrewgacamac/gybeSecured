
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5500',
    'https://yardguardtoronto.com',
    'https://www.yardguardtoronto.com',
    'https://contact.yardguardtoronto.com',
    'https://yardguardgta.com',
    'https://www.yardguardgta.com',
    'https://whale-app-jglyk.ondigitalocean.app'
];

export function handleCors(req: Request) {
    if (req.method === 'OPTIONS') {
        const origin = req.headers.get('Origin');
        const headers = new Headers({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        });

        if (origin && allowedOrigins.includes(origin)) {
            headers.set('Access-Control-Allow-Origin', origin);
        } else {
            // Fallback for development flexibility
            headers.set('Access-Control-Allow-Origin', '*');
        }

        return new Response('ok', { headers });
    }
    return null;
}

export function withCors(res: Response): Response {
    const headers = new Headers(res.headers);

    // Default to * for simplicity, relying on Preflight for access control
    if (!headers.has('Access-Control-Allow-Origin')) {
        headers.set('Access-Control-Allow-Origin', '*');
    }
    headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

    return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers
    });
}
