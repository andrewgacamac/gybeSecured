
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function processAll() {
    console.log('Checking for stuck leads...');

    const { data: leads, error } = await supabase
        .from('leads')
        .select('id, status')
        .eq('status', 'NEW');

    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }

    console.log(`Found ${leads.length} leads in NEW status.`);

    for (const lead of leads) {
        console.log(`Checking lead ${lead.id}...`);

        const { count, error: photoError } = await supabase
            .from('photos')
            .select('*', { count: 'exact', head: true })
            .eq('lead_id', lead.id);

        if (photoError) console.error('Photo check error:', photoError);

        if (count > 0) {
            console.log(`Lead has ${count} photos. Triggering AI...`);

            // 1. Update status to PROCESSING
            const { error: updateError } = await supabase
                .from('leads')
                .update({ status: 'PROCESSING' })
                .eq('id', lead.id);

            if (updateError) {
                console.error('Failed to update status:', updateError);
                continue;
            }

            // 2. Invoke AI Orchestrator
            const { error: invokeError } = await supabase.functions.invoke('ai-orchestrator', {
                body: { lead_id: lead.id }
            });

            if (invokeError) {
                console.error('AI Invoke Error:', invokeError);
            } else {
                console.log('✅ AI Triggered Successfully.');
            }
        } else {
            console.log('Skipping (No photos).');
        }
    }
    console.log('Processing complete.');
}

processAll();
