import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`
    }
  }
})

export async function createOrUpdateUser(username: string, spotifyId: string) {
  // First check if user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select()
    .eq('spotify_id', spotifyId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    throw fetchError
  }

  if (existingUser) {
    // Update existing user
    const { data, error } = await supabase
      .from('users')
      .update({ username })
      .eq('id', existingUser.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new user
    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        spotify_id: spotifyId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export async function saveTrack(track: SpotifyApi.TrackObjectFull) {
  try {
    // First check if track exists
    const { data: existingTrack, error: fetchError } = await supabase
      .from('tracks')
      .select()
      .eq('spotify_id', track.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw fetchError
    }

    if (existingTrack) {
      // Update existing track
      const { data, error } = await supabase
        .from('tracks')
        .update({
          name: track.name,
          artist: track.artists[0].name,
          album: track.album.name,
          image_url: track.album.images[0]?.url || '',
        })
        .eq('id', existingTrack.id)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Create new track
      const { data, error } = await supabase
        .from('tracks')
        .insert({
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
  } catch (error) {
    console.error('Error saving track:', error)
    throw error
  }
}

export async function saveUserTracks(userId: string, tracks: SpotifyApi.TrackObjectFull[]) {
  try {
    console.log('Starting saveUserTracks with userId:', userId);
    console.log('Received tracks:', tracks);

    // Only take the top 5 tracks
    const topTracks = tracks.slice(0, 5)
    console.log('Processing top 5 tracks:', topTracks);
    
    // Save the tracks first
    console.log('Saving individual tracks...');
    const savedTracks = await Promise.all(topTracks.map(track => saveTrack(track)))
    console.log('Tracks saved:', savedTracks);
    
    // Delete existing user_tracks for this user
    console.log('Deleting existing user tracks for userId:', userId);
    const { error: deleteError } = await supabase
      .from('user_tracks')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting existing user tracks:', deleteError)
      throw deleteError
    }
    console.log('Successfully deleted existing user tracks');

    // Create new user_tracks entries with rank and timestamp
    const userTracks = savedTracks.map((track, index) => ({
      user_id: userId,
      track_id: track.id,
      rank: index + 1,
      created_at: new Date().toISOString()
    }))
    console.log('Prepared user tracks for insertion:', userTracks);

    // Insert new user_tracks
    console.log('Inserting new user tracks...');
    const { data, error } = await supabase
      .from('user_tracks')
      .insert(userTracks)
      .select(`
        rank,
        tracks (
          id,
          name,
          artist,
          album,
          image_url,
          spotify_id
        )
      `)

    if (error) {
      console.error('Error saving user tracks:', error)
      throw error
    }

    console.log('Successfully saved user tracks:', data);
    return data
  } catch (error) {
    console.error('Error in saveUserTracks:', error)
    throw error
  }
}

interface UserTrackWithRelations {
  users: {
    id: string;
    username: string;
  };
  tracks: {
    id: string;
    name: string;
    artist: string;
    album: string;
    image_url: string;
    spotify_id: string;
  };
  rank: number;
}

export async function getAllUserTracks() {
  const { data, error } = await supabase
    .from('user_tracks')
    .select(`
      rank,
      users (
        id,
        username
      ),
      tracks (
        id,
        name,
        artist,
        album,
        image_url,
        spotify_id
      )
    `)
    .order('rank', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all user tracks:', error)
    throw error
  }

  // Group tracks by user
  const userTracks = (data as unknown as UserTrackWithRelations[])?.reduce((acc, track) => {
    const userId = track.users.id
    if (!acc[userId]) {
      acc[userId] = {
        user: track.users,
        tracks: []
      }
    }
    acc[userId].tracks.push({
      ...track.tracks,
      rank: track.rank
    })
    return acc
  }, {} as Record<string, { user: { id: string; username: string }, tracks: any[] }>)

  return Object.values(userTracks) || []
}

export interface Track {
  id: string
  name: string
  artist: string
  album: string
  image_url: string
  spotify_id: string
  rank: number
}

interface UserTrackResponse {
  tracks: {
    id: string;
    name: string;
    artist: string;
    album: string;
    image_url: string | null;
    spotify_id: string;
  };
  rank: number;
}

export async function getUserTracks(userId: string): Promise<Track[]> {
  try {
    console.log('Fetching tracks for userId:', userId);
    
    const { data, error } = await supabase
      .from('user_tracks')
      .select(`
        rank,
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
      .order('rank', { ascending: true })

    if (error) {
      console.error('Error fetching user tracks:', error)
      throw error
    }

    if (!data || !Array.isArray(data)) {
      console.warn('No data or invalid data format received:', data)
      return []
    }

    console.log('Raw data from Supabase:', data);

    // Transform and validate the data
    const tracks: Track[] = data
      .filter((item: any) => {
        // Validate the item structure
        const isValid = item &&
          typeof item === 'object' &&
          item.tracks &&
          typeof item.tracks === 'object' &&
          typeof item.tracks.id === 'string' &&
          typeof item.rank === 'number'
        
        if (!isValid) {
          console.warn('Invalid track item:', item)
        }
        return isValid
      })
      .map((item: any) => {
        // Create a valid track object with fallbacks
        const track = {
          id: item.tracks.id,
          name: String(item.tracks.name || ''),
          artist: String(item.tracks.artist || ''),
          album: String(item.tracks.album || ''),
          image_url: String(item.tracks.image_url || ''),
          spotify_id: String(item.tracks.spotify_id || ''),
          rank: Number(item.rank) || 0
        }
        console.log('Processed track:', track)
        return track
      })

    console.log('Final processed tracks:', tracks)
    return tracks
  } catch (error) {
    console.error('Error in getUserTracks:', error)
    throw error
  }
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

export async function cleanupAllTables() {
  try {
    // First delete from user_tracks (junction table)
    const { error: userTracksError } = await supabase
      .from('user_tracks')
      .delete()
      .gte('user_id', '00000000-0000-0000-0000-000000000000') // This will match all UUIDs

    if (userTracksError) {
      console.error('Error cleaning user_tracks:', userTracksError)
      throw userTracksError
    }

    // Then delete from tracks
    const { error: tracksError } = await supabase
      .from('tracks')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000') // This will match all UUIDs

    if (tracksError) {
      console.error('Error cleaning tracks:', tracksError)
      throw tracksError
    }

    // Finally delete from users
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000') // This will match all UUIDs

    if (usersError) {
      console.error('Error cleaning users:', usersError)
      throw usersError
    }

    console.log('All tables cleaned successfully')
    return true
  } catch (error) {
    console.error('Error during cleanup:', error)
    throw error
  }
} 