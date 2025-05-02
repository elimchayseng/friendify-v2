import { createClient } from '@supabase/supabase-js'
import { config } from '../config/config.js'

export const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.supabaseKey}`
    }
  }
}) 