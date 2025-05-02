import * as dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '../../.env') })

// Validate environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'CRON_SECRET']
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}

export const config = {
  supabaseUrl: process.env.SUPABASE_URL as string,
  supabaseKey: process.env.SUPABASE_ANON_KEY as string,
  cronSecret: process.env.CRON_SECRET as string,
  port: process.env.PORT || 5001
} 