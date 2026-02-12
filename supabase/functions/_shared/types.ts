export type LeadStatus =
    | 'NEW'
    | 'PROCESSING'
    | 'NEEDS_REVIEW'
    | 'APPROVED'
    | 'REJECTED'
    | 'COMPLETED'
    | 'FAILED';

export interface Lead {
    id: string;
    idempotency_key: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address?: string;
    status: LeadStatus;
    ai_estimate?: string;
    final_estimate?: string;
    rejection_reason?: string;
    approved_by?: string;
    retry_count: number;
    created_at: string;
    updated_at: string;
    // Extended fields
    package_interest?: string;
    project_type?: string;
    timeline?: string;
    message_content?: string;
    referral_source?: string;
    project_size?: string;
}

export interface Photo {
    id: string;
    lead_id: string;
    original_path: string;
    processed_path?: string;
    created_at: string;
    updated_at: string;
}

export interface AdminUser {
    id: string;
    email: string;
    role: 'admin' | 'reviewer';
    is_active: boolean;
    last_login?: string;
    created_at: string;
}

export interface AuditLogEntry {
    id: string;
    user_id?: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    details?: Record<string, unknown>;
    created_at: string;
}

export interface LeadEvent {
    id: string;
    lead_id: string;
    event_type: string;
    old_status?: LeadStatus;
    new_status?: LeadStatus;
    actor_id?: string;
    details?: Record<string, unknown>;
    created_at: string;
}

// Webhook payload from Supabase
export interface WebhookPayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    schema: string;
    record: Record<string, unknown>;
    old_record?: Record<string, unknown>;
}
