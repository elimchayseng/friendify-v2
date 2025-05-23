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
        detectSessionInUrl: true,
        flowType: 'pkce'
    }
})


export async function saveUserTracks(userId: string, tracks: SpotifyApi.TrackObjectFull[]) {
    try {

        // Only take the top 5 tracks
        const topTracks = tracks.slice(0, 5)

        // Prepare all tracks for batch upsert
        const tracksToUpsert = topTracks.map(track => ({
            name: track.name,
            artist: track.artists[0].name,
            album: track.album.name,
            spotify_id: track.id,
            image_url: track.album?.images?.[0]?.url || null
        }))

        // Batch upsert all tracks
        const { data: savedTracks, error: tracksError } = await supabase
            .from('tracks')
            .upsert(tracksToUpsert, {
                onConflict: 'spotify_id',
                ignoreDuplicates: false
            })
            .select()

        if (tracksError) throw tracksError
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

        console.log('Inserting new user tracks...');
        const { data, error } = await supabase
            .from('user_tracks')
            .upsert(userTracks, { onConflict: 'user_id,track_id' })
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
      created_at,
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
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching all user tracks:', error)
        throw error
    }

    // Group by user and take top 5 per user by created_at
    const userTrackMap = new Map<string, UserTrackWithRelations[]>()
    
    ;(data as unknown as (UserTrackWithRelations & { created_at: string })[])?.forEach(track => {
        const userId = track.users.id
        if (!userTrackMap.has(userId)) {
            userTrackMap.set(userId, [])
        }
        const userTracks = userTrackMap.get(userId)!
        if (userTracks.length < 5) {
            userTracks.push(track)
        }
    })

    // Convert to final format
    const userTracks = Array.from(userTrackMap.entries()).map(([userId, tracks]) => ({
        user: tracks[0].users,
        tracks: tracks.map(track => ({
            ...track.tracks,
            rank: track.rank
        })).sort((a, b) => a.rank - b.rank)
    }))

    return userTracks
}
