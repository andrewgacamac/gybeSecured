
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const configContent = `// Auto-generated config
window.YardGuardConfig = {
    SUPABASE_URL: '${process.env.SUPABASE_URL || "MISSING_URL"}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY || "MISSING_KEY"}'
};
console.log('YardGuard Config Loaded (Secure)');
`;

fs.writeFileSync('public/js/config.js', configContent);
console.log('✅ Generated public/js/config.js');
