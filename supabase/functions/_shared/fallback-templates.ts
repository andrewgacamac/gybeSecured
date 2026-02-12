import { Lead } from './types.ts';

export function getFallbackEstimate(lead: Lead): string {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ARTIFICIAL TURF CONSULTATION REQUEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hello ${lead.first_name},

Thank you for your interest in artificial turf installation!

We've received your photos and contact information.
Due to high demand, our automated estimate system is
temporarily unavailable.

WHAT HAPPENS NEXT:
------------------
One of our specialists will personally review your
submission and provide a detailed quote within
24-48 business hours.

YOUR SUBMISSION:
----------------
Name: ${lead.first_name} ${lead.last_name}
Email: ${lead.email}
${lead.phone ? `Phone: ${lead.phone}` : ''}
${lead.address ? `Address: ${lead.address}` : ''}

TYPICAL PRICING RANGE:
----------------------
• Small yards (under 500 sq ft): $3,000 - $6,000
• Medium yards (500-1000 sq ft): $5,000 - $10,000
• Large yards (1000+ sq ft): $8,000 - $15,000

These ranges include materials and professional
installation. Your final quote will be customized
based on your specific requirements.

Questions? Reply to this email or call us directly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}

export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MINUTES = 15;
