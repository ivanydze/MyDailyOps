console.log('Script started');
console.log('Args:', process.argv.slice(2));

const SUPABASE_URL = process.argv[6] || '';
const SUPABASE_ANON_KEY = process.argv[7] || '';
const TEST_USER1_EMAIL = process.argv[2] || '';
const TEST_USER2_EMAIL = process.argv[4] || '';

console.log('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('USER1:', TEST_USER1_EMAIL);
console.log('USER2:', TEST_USER2_EMAIL);

