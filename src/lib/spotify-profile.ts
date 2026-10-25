import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

type SpotifyProfile = Database['public']['Tables']['users']['Insert']

export async function saveSpotifyProfile(
  client: SupabaseClient<Database>,
  profile: SpotifyProfile
) {
  const { refresh_token, ...values } = profile

  return client
    .from('users')
    .upsert(
      {
        ...values,
        // Omit absent tokens so the database retains its current value,
        // including a token rotated by the cron while login was in flight.
        ...(refresh_token?.trim() ? { refresh_token } : {}),
      },
      { onConflict: 'spotify_id' }
    )
    .select()
    .single()
}
