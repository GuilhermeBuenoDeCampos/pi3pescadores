const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('SUPABASE_URL or SUPABASE_KEY is not set. Supabase client will not be created and uploads will fallback to local storage.');
  module.exports = null;
} else {
  try {
    // require dynamically only when credentials are present
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    module.exports = supabase;
  } catch (err) {
    console.error('Failed to create Supabase client:', err.message);
    module.exports = null;
  }
}
