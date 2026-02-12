
import { ExternalServiceError } from './errors.ts';

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
// Valid endpoint for Text Generation
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface EstimateResult {
    success: boolean;
    estimateText?: string;
    error?: string;
}

export async function generateAIEstimate(
    leadData: any,
    _imageUrl?: string
): Promise<EstimateResult> {

    if (!GOOGLE_AI_API_KEY) {
        console.warn('GOOGLE_AI_API_KEY not configured, using fallback');
        return createFallbackEstimate(leadData);
    }

    try {
        const prompt = `
        You are an expert artificial turf estimator for YardGuard.
        Based on the customer's request, provide a preliminary cost estimate range.
        
        Customer: ${leadData.first_name} ${leadData.last_name}
        Address: ${leadData.street_address || leadData.address || 'Not provided'}
        City: ${leadData.city || 'Mississauga'}
        
        Project Details:
        - Package: ${leadData.package_interest || 'Standard Installation'}
        - Project Type: ${Array.isArray(leadData.project_type) ? leadData.project_type.join(', ') : (leadData.project_type || 'Unspecified')}
        - Approximate Size: ${leadData.approximate_size || 'Typical 600-1000 sq ft'}
        - Timeline: ${leadData.timeline || 'Flexible'}
        - Source: ${leadData.referral_source || 'Website'}
        
        Customer Message: "${leadData.message_content || 'No specific requests'}"
        
        Please provide:
        1. Confirmed understanding of their package choice (${leadData.package_interest || 'Standard'}).
        2. Estimated square footage based on their input (${leadData.approximate_size || 'estimated'}).
        3. Price range ($12-$18 per sq ft for install).
        4. Total estimated cost range.
        5. Brief explanation of benefits relevant to their project type (e.g. emphasize pet features if 'PawGuard' or 'pet-yard' is selected).
        
        Keep it professional, concise, and encourage booking a site visit for final pricing.
        `;

        const response = await fetch(`${GEMINI_ENDPOINT}?key=${GOOGLE_AI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', errorText);
            throw new ExternalServiceError('Google Gemini', `API error: ${response.status}`);
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No text generated from Gemini');
        }

        return {
            success: true,
            estimateText: text
        };

    } catch (error) {
        console.error('AI Estimator error:', error);
        return createFallbackEstimate(leadData);
    }
}

function createFallbackEstimate(leadData: any): EstimateResult {
    const fallbackText = `Estimated Date: ${new Date().toLocaleDateString()}\n\nDear ${leadData.first_name},\n\nBased on your request, we estimate a standard yard installation to cost between $5,000 - $8,000 depending on specific measurements.\n\nPlease schedule a site visit for a precise quote.`;
    return {
        success: true,
        estimateText: fallbackText
    };
}
