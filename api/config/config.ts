export const config = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY,
    cronSecret: process.env.CRON_SECRET,
    port: process.env.PORT || 5001
  }