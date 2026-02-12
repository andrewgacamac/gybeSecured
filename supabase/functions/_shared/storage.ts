import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const BUCKETS = {
    RAW_UPLOADS: 'raw_uploads',
    PROCESSED_IMAGES: 'processed_images',
} as const;

// Signed URL expiry: 90 days for email links
export const SIGNED_URL_EXPIRY = 90 * 24 * 60 * 60; // seconds

/**
 * Generate a signed URL for a file
 */
export async function getSignedUrl(
    supabase: SupabaseClient,
    bucket: string,
    path: string,
    expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

    if (error) {
        console.error('Error creating signed URL:', error);
        return null;
    }

    return data.signedUrl;
}

/**
 * Download a file from storage
 */
export async function downloadFile(
    supabase: SupabaseClient,
    bucket: string,
    path: string
): Promise<Blob | null> {
    const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

    if (error) {
        console.error('Error downloading file:', error);
        return null;
    }

    return data;
}

/**
 * Upload a file to storage
 */
export async function uploadFile(
    supabase: SupabaseClient,
    bucket: string,
    path: string,
    file: Blob | ArrayBuffer,
    contentType: string
): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            contentType,
            upsert: true,
        });

    if (error) {
        console.error('Error uploading file:', error);
        return null;
    }

    return data.path;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
    supabase: SupabaseClient,
    bucket: string,
    path: string
): Promise<boolean> {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

    if (error) {
        console.error('Error deleting file:', error);
        return false;
    }

    return true;
}

/**
 * Validate file type and size
 */
export function validateFile(
    file: { type: string; size: number },
    allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: number = 10 * 1024 * 1024 // 10MB
): { valid: boolean; error?: string } {
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
    }

    if (file.size > maxSize) {
        return { valid: false, error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB` };
    }

    return { valid: true };
}
