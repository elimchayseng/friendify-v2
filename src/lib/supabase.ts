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

    // Safely get the image URL
    const imageUrl = track.album?.images?.[0]?.url || null;
    console.log('Image URL for track:', track.name, imageUrl);

    const trackData = {
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      spotify_id: track.id,
      ...(imageUrl ? { image_url: imageUrl } : {})
    }

    if (existingTrack) {
      // Update existing track
      const { data, error } = await supabase
        .from('tracks')
        .update(trackData)
        .eq('id', existingTrack.id)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Create new track
      const { data, error } = await supabase
        .from('tracks')
        .insert(trackData)
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
  id: string;
  name: string;
  artist: string;
  album: string;
  image_url: string | null;
  spotify_id: string;
  rank: number;
}

interface UserTrackData {
  rank: number;
  tracks: {
    id: string;
    name: string;
    artist: string;
    album: string;
    image_url: string | null;
    spotify_id: string;
  };
}

export async function getUserTracks(userId: string): Promise<Track[]> {
  try {
    console.log('Getting tracks for user:', userId);
    
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
      .order('rank', { ascending: true });

    if (error) {
      console.error('Error fetching user tracks:', error);
      throw error;
    }

    if (!data || !Array.isArray(data)) {
      console.warn('No data returned from getUserTracks query');
      return [];
    }

    console.log('Raw user tracks data:', data);

    // Transform the data into the expected format
    const transformedTracks = (data as unknown as UserTrackData[])
      .filter(item => item.tracks && typeof item.tracks === 'object')
      .map(item => ({
        ...item.tracks,
        rank: item.rank,
        // Ensure all required fields are present with defaults
        id: item.tracks.id || '',
        name: item.tracks.name || 'Unknown Track',
        artist: item.tracks.artist || 'Unknown Artist',
        album: item.tracks.album || 'Unknown Album',
        image_url: item.tracks.image_url || null,
        spotify_id: item.tracks.spotify_id || ''
      })) as Track[];

    console.log('Transformed tracks:', transformedTracks);
    return transformedTracks;
  } catch (error) {
    console.error('Error in getUserTracks:', error);
    throw error;
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