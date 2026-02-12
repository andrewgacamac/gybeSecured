
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error('❌ Environment variables missing. Please check .env file.');
    process.exit(1);
}

// Test Anon Client (Public Access)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Test Service Client (Admin Access)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
    console.log('Testing Supabase Connection...');
    console.log(`URL: ${supabaseUrl}`);

    try {
        // 1. Test Anon Key (should work for public reading if RLS allows, or just auth check)
        // We'll just check if the client initializes without error and can make a basic request.
        const { data: anonData, error: anonError } = await supabaseAnon.from('leads').select('count').limit(1);

        if (anonError && anonError.code !== 'PGRST116') { // PGRST116 is just "no rows", which is fine
            console.log('⚠️  Anon Key Test: Connected, but table access might be restricted by RLS (Expected for new project).');
            console.log(`   Error details: ${anonError.message}`);
        } else {
            console.log('✅ Anon Key Test: Success (Public Client Working)');
        }

        // 2. Test Service Key (should have full access)
        // We will try to list tables or just do a simple select that Admin should definitely see
        const { data: adminData, error: adminError } = await supabaseAdmin.from('leads').select('count').limit(1);

        if (adminError) {
            // If table doesn't exist yet, that's a different error
            if (adminError.code === '42P01') {
                console.log('✅ Service Key Test: Success (Authenticated), but "leads" table does not exist yet.');
            } else {
                console.error('❌ Service Key Test Failed:', adminError.message);
            }
        } else {
            console.log('✅ Service Key Test: Success (Admin Client Working)');
        }

    } catch (err) {
        console.error('❌ Unexpected Error:', err.message);
    }
}

testConnection();
