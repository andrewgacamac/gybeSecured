
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const LEAD_ID = 'f00cf275-3072-4bf0-8d27-0a56e5c76e43'; // Andrew Gaca

async function triggerAI() {
    console.log(`⏳ Resetting status to REJECTED then NEW for Lead: ${LEAD_ID}`);

    // 1. REJECTED
    await supabase.from('leads').update({ status: 'REJECTED', rejection_reason: 'Reset for AI' }).eq('id', LEAD_ID);

    // 2. NEW
    const { error: resetError } = await supabase
        .from('leads')
        .update({ status: 'NEW' })
        .eq('id', LEAD_ID);

    if (resetError) {
        console.error('❌ Failed to reset status:', resetError);
        // Try forcing it anyway via admin? Service role should be able to force update if trigger allows?
        // If trigger blocks NEW, maybe try REJECTED -> NEW?
    }

    console.log(`⏳ Setting status to PROCESSING...`);
    const { error: updateError } = await supabase
        .from('leads')
        .update({ status: 'PROCESSING' })
        .eq('id', LEAD_ID);

    if (updateError) {
        console.error('❌ Failed to update status:', updateError);
        return;
    }

    console.log(`🚀 Manually triggering AI Orchestrator...`);
    const { data, error } = await supabase.functions.invoke('ai-orchestrator', {
        body: { lead_id: LEAD_ID }
    });

    if (error) {
        console.error('❌ AI Function Error:', error);
        if (error.context && error.context.json) {
            const errJson = await error.context.json();
            console.error('❌ Error Body:', errJson);
        } else if (error instanceof Error) {
            console.error('❌ Error Message:', error.message);
        }
    } else {
        console.log('✅ AI Function Response:', data);
    }
}

triggerAI();
