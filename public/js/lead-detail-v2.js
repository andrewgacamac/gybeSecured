
import { supabase, checkAuth } from './auth.js';

console.log('Lead Detail JS Loaded (Secure v2)');

const urlParams = new URLSearchParams(window.location.search);
const leadId = urlParams.get('id');

if (!leadId) {
    document.body.innerHTML = '<div style="padding: 20px; color: red;"><h1>Error: No Lead ID provided</h1><a href="index.html">Back to Dashboard</a></div>';
    throw new Error('Missing Lead ID');
}

let currentLead = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Lead Detail: DOM Loaded');

    const nameEl = document.getElementById('lead-name');
    if (nameEl) nameEl.textContent = 'Authenticating...';

    // 1. Authenticate
    currentUser = await checkAuth();
    if (!currentUser) return; // checkAuth redirects if failed

    if (nameEl) nameEl.textContent = 'Loading Lead Data...';

    // 2. Load Data
    await loadLeadDetails();

    // 3. Setup Events
    setupEventListeners();
});

function setupEventListeners() {
    // Buttons
    const saveBtn = document.getElementById('save-estimate-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveEstimate);

    const saveNotesBtn = document.getElementById('save-notes-btn');
    if (saveNotesBtn) saveNotesBtn.addEventListener('click', saveInternalNotes);

    const approveBtn = document.getElementById('approve-btn');
    if (approveBtn) approveBtn.addEventListener('click', approveLead);

    const resendBtn = document.getElementById('resend-btn');
    if (resendBtn) resendBtn.addEventListener('click', resendEmail);

    // Reject Modal
    const rejectModal = document.getElementById('reject-modal');
    const rejectBtn = document.getElementById('reject-btn');
    const cancelReject = document.getElementById('cancel-reject');
    const confirmReject = document.getElementById('confirm-reject');

    // Delete Button
    const deleteBtn = document.getElementById('delete-lead-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteLead);

    // Regenerate Button
    const regenerateBtn = document.getElementById('regenerate-btn');
    if (regenerateBtn) regenerateBtn.addEventListener('click', regenerateImages);

    if (rejectBtn) rejectBtn.addEventListener('click', () => rejectModal.style.display = 'flex');
    if (cancelReject) cancelReject.addEventListener('click', () => rejectModal.style.display = 'none');
    if (confirmReject) confirmReject.addEventListener('click', rejectLead);

    // Image Modal
    const imgModal = document.getElementById('img-modal');
    const modalClose = document.getElementsByClassName('modal-close')[0];

    if (modalClose) modalClose.addEventListener('click', () => imgModal.style.display = 'none');
    if (imgModal) imgModal.addEventListener('click', (e) => {
        if (e.target === imgModal) imgModal.style.display = 'none';
    });
}

async function loadLeadDetails() {
    try {
        const { data: lead, error } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (error) throw error;
        currentLead = lead;

        renderLead(lead);
        await loadPhotos(); // Load photos after lead details

    } catch (error) {
        console.error('Error loading lead:', error);
        alert('Failed to load lead details: ' + error.message);
    }
}

function renderLead(lead) {
    // Basic Fields
    setText('lead-name', `${lead.first_name || ''} ${lead.last_name || ''}`);
    setText('lead-email', lead.email);
    setText('lead-phone', lead.phone || 'N/A');
    setText('lead-address', lead.street_address || lead.address || 'N/A');
    setText('lead-city-postal', [lead.city, lead.postal_code].filter(Boolean).join(', ') || 'N/A');
    setText('lead-created', new Date(lead.created_at).toLocaleString());
    setText('lead-retry', lead.retry_count || 0);

    // Project Specs
    setText('lead-package', lead.package_interest);
    setText('lead-size', lead.approximate_size);
    setText('lead-timeline', lead.timeline);
    setText('lead-source', lead.referral_source);
    setText('lead-message', lead.message_content || '(No message)');

    // Project Types
    let types = lead.project_type || [];
    if (typeof types === 'string' && types.startsWith('{')) {
        types = types.replace(/[{}]/g, '').split(','); // Handle Postgres array string if needed
    }
    setText('lead-type', Array.isArray(types) ? types.join(', ') : (types || '-'));

    // Inputs
    setVal('estimate-text', lead.final_estimate || lead.ai_estimate || '');
    setVal('internal-notes', lead.internal_notes || '');

    // Status Badge
    const statusBadge = document.getElementById('lead-status-badge');
    if (statusBadge) {
        const statusClass = (lead.status || 'new').toLowerCase().replace('_', '-');
        statusBadge.innerHTML = `<span class="badge badge-${statusClass}">${lead.status}</span>`;
    }

    // Rejection UI
    if (lead.rejection_reason) {
        document.getElementById('rejection-box').style.display = 'block';
        setText('rejection-reason', lead.rejection_reason);
    }

    // Buttons Logic
    const actionsDiv = document.getElementById('actions-container');
    const approveBtn = document.getElementById('approve-btn');
    const resendBtn = document.getElementById('resend-btn');
    const saveEstimateBtn = document.getElementById('save-estimate-btn');
    const estimateText = document.getElementById('estimate-text');

    if (actionsDiv && approveBtn && resendBtn) {
        if (['COMPLETED', 'APPROVED'].includes(lead.status)) {
            resendBtn.style.display = 'inline-block';
            approveBtn.style.display = 'none';
            actionsDiv.style.display = 'flex';
        } else if (lead.status === 'REJECTED') {
            actionsDiv.style.display = 'none';
            if (saveEstimateBtn) saveEstimateBtn.disabled = true;
            if (estimateText) estimateText.disabled = true;
        } else {
            approveBtn.style.display = 'inline-block';
            resendBtn.style.display = 'none';
        }
    }

    // Pre-populate Prompt
    const promptInput = document.getElementById('ai-prompt-input');
    if (promptInput) {
        let defaultPrompt = "fresh artificial turf";
        if (lead.package_interest) {
            const interest = lead.package_interest.toLowerCase();
            if (interest.includes('pawguard')) {
                defaultPrompt = "durable, pet-friendly artificial turf, short pile height, slightly reinforced";
            } else if (interest.includes('augusta') || interest.includes('golf')) {
                defaultPrompt = "professional putting green turf, very short and smooth, with a slightly longer fringe grass border";
            } else if (interest.includes('premium')) {
                defaultPrompt = "high-end luxury artificial turf, dense and lush, perfectly manicured";
            } else if (interest.includes('easy')) {
                defaultPrompt = "maintenance-free, natural-looking artificial turf, medium pile height";
            }
        }
        promptInput.value = defaultPrompt;
    }
}

async function loadPhotos() {
    console.log('DEBUG: loadPhotos() called for lead:', leadId);
    const container = document.getElementById('photos-container');
    if (!container) return;
    container.innerHTML = 'Loading photos...';

    const { data: photos, error } = await supabase
        .from('photos')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at');

    if (error) {
        console.error('DEBUG: Photo DB Error:', error);
        container.innerHTML = 'Error loading photos: ' + error.message;
        return;
    }

    console.log(`DEBUG: Found ${photos.length} photos in DB.`);

    container.innerHTML = '';
    if (!photos || photos.length === 0) {
        container.innerHTML = 'No photos found.';
        return;
    }

    for (const photo of photos) {
        console.log('DEBUG: Processing photo:', photo.original_path);
        let originalUrl = null;
        let processedUrl = null;

        try {
            // Use Public URL (Buckets are public)
            if (photo.original_path) {
                const { data } = supabase.storage.from('raw_uploads').getPublicUrl(photo.original_path);
                originalUrl = data.publicUrl;
                console.log('DEBUG: Public URL (Original):', originalUrl);
            }

            if (photo.processed_path) {
                const { data } = supabase.storage.from('processed_images').getPublicUrl(photo.processed_path);
                processedUrl = data.publicUrl;
                console.log('DEBUG: Public URL (Processed):', processedUrl);
            }
        } catch (e) {
            console.error('DEBUG: Exception getting URL:', e);
        }

        const div = document.createElement('div');
        div.innerHTML = `
            <div style="position: relative;">
                <img src="${originalUrl || '#'}" onclick="window.openModal('${originalUrl}')" title="Original" style="width: 100%; height: 150px; object-fit: cover; cursor: pointer;" loading="lazy" onerror="console.error('Image Load Failed (Original):', this.src, this)">
                ${processedUrl ? `<div style="position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; font-size: 10px;">PROCESSED</div>` : ''}
            </div>
            ${processedUrl ? `
                <div style="border-top: 1px solid var(--border);">
                    <img src="${processedUrl}" onclick="window.openModal('${processedUrl}')" title="Processed" loading="lazy" style="width: 100%; height: 150px; object-fit: cover; cursor: pointer;" onerror="console.error('Image Load Failed (Processed):', this.src)">
                </div>
            ` : ''}
            <div class="photo-meta">Uploaded: ${new Date(photo.created_at).toLocaleDateString()}</div>
        `;
        container.appendChild(div);
    }
}

// --- Action Functions ---

async function saveEstimate() {
    const newEstimate = document.getElementById('estimate-text').value;
    const btn = document.getElementById('save-estimate-btn');
    updateBtn(btn, true, 'Saving...');

    try {
        const { error } = await supabase
            .from('leads')
            .update({ final_estimate: newEstimate })
            .eq('id', leadId);

        if (error) throw error;
        alert('Estimate saved successfully');
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        updateBtn(btn, false, 'Save Estimate');
    }
}

async function saveInternalNotes() {
    const notes = document.getElementById('internal-notes').value;
    const btn = document.getElementById('save-notes-btn');
    updateBtn(btn, true, 'Saving...');

    try {
        const { error } = await supabase
            .from('leads')
            .update({ internal_notes: notes })
            .eq('id', leadId);

        if (error) throw error;
        alert('Internal notes saved.');
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        updateBtn(btn, false, 'Save Notes');
    }
}

async function approveLead() {
    if (!confirm('Approve lead and send email to customer?')) return;

    const btn = document.getElementById('approve-btn');
    updateBtn(btn, true, 'Sending...');

    try {
        if (!currentUser || !currentUser.id) throw new Error("User session lost");

        // 1. Update DB Status
        const { error: dbError } = await supabase
            .from('leads')
            .update({
                status: 'APPROVED',
                approved_by: currentUser.id
            })
            .eq('id', leadId);

        if (dbError) throw dbError;

        // 2. Call Edge Function (Email Sender)
        const { data: emailData, error: emailError } = await supabase.functions.invoke('email-sender', {
            body: { lead_id: leadId }
        });

        if (emailError) {
            console.error(emailError);
            alert('Lead Approved, but Email Failed. Check Logs.');
        } else {
            alert('Success! Lead approved and email sent.');
            window.location.reload();
        }

    } catch (error) {
        console.error(error);
        alert('Approval Failed: ' + error.message);
    } finally {
        updateBtn(btn, false, 'Approve & Send Email');
    }
}

async function rejectLead() {
    const reason = document.getElementById('reject-reason-input').value;
    if (!reason) return alert('Enter a reason');

    const btn = document.getElementById('confirm-reject');
    updateBtn(btn, true, 'Rejecting...');

    try {
        const { error } = await supabase
            .from('leads')
            .update({
                status: 'REJECTED',
                rejection_reason: reason
            })
            .eq('id', leadId);

        if (error) throw error;
        window.location.href = 'index.html';
    } catch (error) {
        alert('Error: ' + error.message);
        updateBtn(btn, false, 'Confirm Reject');
    }
}

async function resendEmail() {
    if (!confirm('Resend email?')) return;
    const btn = document.getElementById('resend-btn');
    updateBtn(btn, true, 'Sending...');

    try {
        const { error } = await supabase.functions.invoke('email-sender', {
            body: { lead_id: leadId }
        });
        if (error) throw error;
        alert('Email sent successfully!');
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        updateBtn(btn, false, 'Resend Email');
    }
}

async function deleteLead() {
    if (!confirm('WARNING: Are you sure you want to delete this lead? This cannot be undone and will remove all photos and data.')) return;

    const btn = document.getElementById('delete-lead-btn');
    updateBtn(btn, true, 'Deleting...');

    try {
        const { error } = await supabase.functions.invoke('admin-delete-lead', {
            body: { lead_id: leadId }
        });

        if (error) throw error;

        alert('Lead permanently deleted.');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete: ' + error.message);
        updateBtn(btn, false, 'Delete Lead Permanently');
    }
}

async function regenerateImages() {
    if (!confirm('Are you sure you want to regenerate the AI images? This will overwrite existing results.')) return;

    const btn = document.getElementById('regenerate-btn');
    const promptVal = document.getElementById('ai-prompt-input').value;

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    try {
        const { error } = await supabase.functions.invoke('admin-regenerate-images', {
            body: { lead_id: leadId, prompt: promptVal }
        });

        if (error) throw error;

        alert('Regeneration started! The page will reload in 5 seconds to show new images.');
        setTimeout(() => {
            window.location.reload();
        }, 5000);

    } catch (error) {
        console.error('Regenerate failed:', error);
        alert('Failed to regenerate: ' + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Helpers
function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '-';
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function updateBtn(btn, disabled, text) {
    if (!btn) return;
    btn.disabled = disabled;
    btn.textContent = text;
}

// Global Modal Opener
window.openModal = function (src) {
    const modal = document.getElementById('img-modal');
    const img = document.getElementById('modal-img-content');
    if (modal && img && src) {
        img.src = src;
        modal.style.display = 'flex';
    }
}
