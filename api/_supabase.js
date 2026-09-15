import { createClient } from '@supabase/supabase-js';

    const supabaseUrl = process.env.SUPABASE_DB_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_DB_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase server environment variables are not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    export default supabase;
    