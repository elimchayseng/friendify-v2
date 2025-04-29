import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey)

export async function createOrUpdateUser(username: string, spotifyId: string) {
  const { data, error } = await supabase
    .from('users')
    .upsert({
      username,
      spotify_id: spotifyId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveTrack(track: SpotifyApi.TrackObjectFull) {
  const { data, error } = await supabase
    .from('tracks')
    .upsert({
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      image_url: track.album.images[0]?.url || '',
      spotify_id: track.id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveUserTracks(userId: string, tracks: SpotifyApi.TrackObjectFull[]) {
  const savedTracks = await Promise.all(tracks.map(track => saveTrack(track)))
  
  const userTracks = savedTracks.map(track => ({
    user_id: userId,
    track_id: track.id,
  }))

  const { data, error } = await supabase
    .from('user_tracks')
    .upsert(userTracks)
    .select()

  if (error) throw error
  return data
}

export async function getTrackOfDay() {
  const { data, error } = await supabase
    .from('tracks')
    .select()
    .eq('is_track_of_day', true)
    .single()

  if (error) throw error
  return data
}

export async function getUserTracks(userId: string) {
  const { data, error } = await supabase
    .from('user_tracks')
    .select(`
      tracks (
        id,
        name,
        artist,
        album,
        image_url,
        spotify_id
      )
    `)
    .eq('user_id', userId)

  if (error) throw error
  return data
} 