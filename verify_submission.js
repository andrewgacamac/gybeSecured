
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
    console.log('🔍 Verifying Submission...');

    // 1. Check Leads
    const { data: leads, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (leadError) {
        console.error('❌ Lead Error:', leadError);
        return;
    }

    if (leads.length === 0) {
        console.error('❌ No leads found!');
        return;
    }

    const latestLead = leads[0];
    console.log(`✅ FOUND LEAD: ${latestLead.first_name} ${latestLead.last_name} (${latestLead.email})`);
    console.log(`   ID: ${latestLead.id}`);
    console.log(`   Status: ${latestLead.status}`);

    // 2. Check Photos Record
    const { data: photos, error: photoError } = await supabase
        .from('photos')
        .select('*')
        .eq('lead_id', latestLead.id);

    if (photoError) {
        console.error('❌ Photo DB Error:', photoError);
    } else {
        console.log(`✅ FOUND ${photos.length} PHOTOS in DB`);
        photos.forEach(p => console.log(`   - ${p.original_path}`));
    }

    // 3. Check Storage File
    if (photos.length > 0) {
        const file = photos[0];
        const { data: fileData, error: fileError } = await supabase.storage
            .from('raw_uploads')
            .list(latestLead.id); // Folder name is lead ID

        if (fileError) {
            console.error('❌ Storage Error:', fileError);
        } else {
            // Verify file exists in the folder
            const exists = fileData.some(f => file.original_path.endsWith(f.name));
            if (exists) {
                console.log(`✅ STORAGE CONFIRMED: File exists in 'raw_uploads/${latestLead.id}/'`);
            } else {
                console.error(`❌ STORAGE MISSING: Could not find file in folder. Contents:`, fileData);
            }
        }
    }
}

verify();
