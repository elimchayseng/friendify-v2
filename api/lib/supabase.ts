import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable')
}
if (!supabaseKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
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

export async function getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, spotify_id, access_token, refresh_token, token_expires_at')
    
    if (error) throw error
    return data || []
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