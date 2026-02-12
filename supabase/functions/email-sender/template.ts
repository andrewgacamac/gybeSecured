import { Lead } from '../_shared/types.ts';

interface EmailTemplateData {
    lead: Lead;
    originalImageUrls: string[];
    processedImageUrls: string[];
}

export function generateEmailHtml(data: EmailTemplateData): string {
    const { lead, originalImageUrls, processedImageUrls } = data;

    // Create image comparison HTML
    const imageComparisonHtml = processedImageUrls.map((processedUrl, index) => {
        const originalUrl = originalImageUrls[index] || '';
        return `
      <div style="margin-bottom: 24px;">
        <h3 style="color: #1a7f37; margin-bottom: 12px;">Photo ${index + 1}</h3>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 280px;">
            <p style="color: #656d76; font-size: 14px; margin-bottom: 8px;">Before</p>
            <img src="${originalUrl}" alt="Original yard" style="width: 100%; border-radius: 8px; border: 1px solid #d0d7de;">
          </div>
          <div style="flex: 1; min-width: 280px;">
            <p style="color: #656d76; font-size: 14px; margin-bottom: 8px;">After (with artificial turf)</p>
            <img src="${processedUrl}" alt="With artificial turf" style="width: 100%; border-radius: 8px; border: 1px solid #d0d7de;">
          </div>
        </div>
      </div>
    `;
    }).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2328;">

      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #1a7f37; margin: 0;">Your Artificial Turf Quote</h1>
        <p style="color: #656d76;">Thank you for your interest!</p>
      </div>

      <div style="background: #f6f8fa; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0;"><strong>Hello ${lead.first_name},</strong></p>
        <p style="margin: 0; color: #656d76;">We've prepared a visualization showing how your yard could look with beautiful artificial turf, along with an estimated quote.</p>
      </div>

      <h2 style="color: #0969da; border-bottom: 2px solid #0969da; padding-bottom: 8px;">Your Yard Transformation</h2>

      ${imageComparisonHtml}

      <h2 style="color: #0969da; border-bottom: 2px solid #0969da; padding-bottom: 8px; margin-top: 32px;">Estimated Quote</h2>

      <div style="background: #dafbe1; padding: 20px; border-radius: 12px; border-left: 4px solid #1a7f37;">
        <pre style="white-space: pre-wrap; font-family: inherit; margin: 0;">${lead.final_estimate || lead.ai_estimate || 'Quote pending'}</pre>
      </div>

      <div style="margin-top: 32px; padding: 20px; background: #f6f8fa; border-radius: 12px; text-align: center;">
        <p style="margin: 0 0 12px 0;"><strong>Ready to transform your yard?</strong></p>
        <p style="margin: 0; color: #656d76;">Reply to this email or call us to schedule a consultation.</p>
      </div>

      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #d0d7de; color: #656d76; font-size: 12px; text-align: center;">
        <p>This quote is valid for 30 days. Final pricing may vary based on site inspection.</p>
        <p>Images will expire in 90 days.</p>
      </div>

    </body>
    </html>
  `;
}

export function generateEmailText(data: EmailTemplateData): string {
    const { lead } = data;
    return `
Hello ${lead.first_name},

Thank you for your interest in artificial turf installation!

We've prepared a visualization of how your yard could look with artificial turf.
Please view the HTML version of this email to see the images.

ESTIMATED QUOTE:
${lead.final_estimate || lead.ai_estimate || 'Quote pending'}

Ready to transform your yard? Reply to this email or call us to schedule a consultation.

This quote is valid for 30 days. Final pricing may vary based on site inspection.
  `.trim();
}
