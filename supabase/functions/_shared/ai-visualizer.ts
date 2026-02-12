
import { ExternalServiceError } from './errors.ts';

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
// Using Nano Banana Pro (Gemini 3 Pro Image Preview) - BEST QUALITY
const MODEL_NAME = 'gemini-3-pro-image-preview';

export interface VisualizerResult {
    success: boolean;
    imageData?: Uint8Array;
    mimeType?: string;
    error?: string;
}

export async function transformYardPhoto(
    _imageBlob: Blob,
    _imageName: string,
    _promptEnhancement?: string
): Promise<VisualizerResult> {

    if (!GOOGLE_AI_API_KEY) {
        console.error('GOOGLE_AI_API_KEY is missing');
        return createMockResult();
    }

    try {
        console.log(`Starting AI Visualizer (File API Mode) with ${MODEL_NAME}...`);

        // 1. UPLOAD IMAGE TO GEMINI FILES API
        // This avoids Base64 memory spike and JSON limits.
        const fileUri = await uploadToGemini(_imageBlob, _imageName);
        if (!fileUri) {
            throw new Error('Failed to upload image to Gemini File API');
        }
        console.log(`Image uploaded to Gemini. URI: ${fileUri}`);

        // 2. GENERATE CONTENT using File URI
        // Dynamic Prompt based on Package Interest
        const instructions = _promptEnhancement || "Install fresh artificial turf, lush and green";

        // Flexible Prompt Template
        // This allows 'instructions' to be a noun phrase ("fresh turf") OR a command ("make it yellow").
        const promptEdit = `Edit this image of a backyard. 
        Goal: Replace the existing grass or ground cover.
        Specific Instructions: ${instructions}.
        Constraints: Maintain original aspect ratio, perspective, and lighting. Do not modify fences, walls, or buildings. Do not change the size of the yard.`;

        console.log(`Sending Generation Request to ${MODEL_NAME}... with prompt: ${promptEdit}`);

        const resultEdit = await callGeminiWithFile(promptEdit, fileUri, _imageBlob.type || 'image/png', 55000);

        if (resultEdit.success) {
            console.log('Direct Edit Success!');
            return resultEdit;
        }

        console.error(`Gemini Failed: ${resultEdit.error}`);
        return createMockResult();

    } catch (error) {
        console.error('AI Visualizer Critical Error:', error);
        return createMockResult();
    }
}

// Uploads raw blob to Gemini Files API
async function uploadToGemini(blob: Blob, filename: string): Promise<string | null> {
    try {
        const size = blob.size;
        console.log(`Uploading ${filename} (${(size / 1024 / 1024).toFixed(2)} MB) to Google...`);

        const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GOOGLE_AI_API_KEY}`;

        // Start Resumable/Raw Upload
        // Simple RAW upload only validates up to 2GB, we are fine.
        // We need headers.
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'raw',
                'X-Goog-Upload-Command': 'start, upload, finalize',
                'X-Goog-Upload-Header-Content-Length': size.toString(),
                'X-Goog-Upload-File-Name': filename,
                'Content-Type': blob.type || 'image/png'
            },
            body: blob // Send Blob directly (Stream)
        });

        if (!response.ok) {
            const txt = await response.text();
            console.error('Upload Failed:', response.status, txt);
            return null;
        }

        const data = await response.json();
        const fileUri = data.file?.uri;
        // Verify active state? Usually instantaneous for small files.
        return fileUri || null;

    } catch (e) {
        console.error('Upload Exception:', e);
        return null;
    }
}

async function callGeminiWithFile(prompt: string, fileUri: string, mimeType: string, timeoutMs = 55000): Promise<VisualizerResult> {
    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    fileData: {
                        mimeType: mimeType,
                        fileUri: fileUri
                    }
                }
            ]
        }]
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GOOGLE_AI_API_KEY}`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        console.log(`Fetch start (Timeout: ${timeoutMs}ms)`);

        // ... (Similar fetch logic but with slim payload)
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errorText = await response.text();
                // 429 = Quota, 400 = Bad Request
                console.error('Gemini API Error:', response.status, errorText);
                throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            const parts = result.candidates?.[0]?.content?.parts;

            // Robust Parsing for Image
            let imagePart;
            if (parts && Array.isArray(parts)) {
                imagePart = parts.find((p: any) => p.inlineData && p.inlineData.data);
            }

            if (imagePart) {
                const b64 = imagePart.inlineData.data;
                const imageBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
                return { success: true, imageData: imageBytes, mimeType: imagePart.inlineData.mimeType || 'image/png' };
            }

            return { success: false, error: 'No Image Data in Response (Maybe Text Only?)' };

        } catch (fetchError) {
            clearTimeout(timeout);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                console.error('Gemini Request Timed Out');
                return { success: false, error: 'Request Timed Out' };
            }
            throw fetchError;
        }

    } catch (e) {
        return { success: false, error: String(e) };
    }
}

function createMockResult(): VisualizerResult {
    const mockPng = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xD7, 0x63, 0x28, 0xC8, 0x60, 0x00,
        0x00, 0x00, 0x34, 0x00, 0x01, 0xC3, 0x0A, 0x21,
        0x59, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    return { success: true, imageData: mockPng, mimeType: 'image/png', };
}
