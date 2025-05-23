import { supabase, getAllUsers, saveUserTracks } from './lib/supabase.js'

const cronSecret = process.env.CRON_SECRET
const clientId = process.env.VITE_SPOTIFY_CLIENT_ID
const clientSecret = process.env.VITE_SPOTIFY_CLIENT_SECRET

export async function refreshSpotifyToken(refreshToken: string) {
    try {
        if (!clientId) {
            throw new Error('Missing Spotify client ID')
        }
        if (!refreshToken) {
            throw new Error('Missing refresh token')
        }
        console.log('Refreshing token with refresh token:', refreshToken)
        console.log('ClientID', clientId)

        const params = new URLSearchParams()
      params.append("client_id", clientId || '')
      params.append("grant_type", "refresh_token")
      params.append("refresh_token", refreshToken)
      params.append("client_secret", clientSecret || '')

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
      })
  
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error_description || data.error || 'Failed to refresh token')
      }
  
      // Calculate expiration time
      const expiresIn = data.expires_in || 3600 // Default to 1 hour
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()
  
      return {
        access_token: data.access_token,
        expires_at: expiresAt,
        // Some implementations return a new refresh token, so include it if it's there
        refresh_token: data.refresh_token || refreshToken
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
      throw error
    }
  }

// Helper function to fetch user's top tracks from Spotify
async function fetchUserTopTracks(accessToken: string, userId: string) {
  try {
    // Get top tracks from Spotify
    const tracksResponse = await fetch(
      'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5',
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    if (!tracksResponse.ok) {
      throw new Error(`Failed to fetch top tracks: ${tracksResponse.status}`)
    }

    const tracksData = await tracksResponse.json()
    
    if (!tracksData.items?.length) {
      console.log(`No top tracks found for user ${userId}`)
      return null
    }

    // Save the tracks to database
    return await saveUserTracks(userId, tracksData.items)
  } catch (error) {
    console.error(`Error fetching top tracks for user ${userId}:`, error)
    throw error
  }
}

// Helper to check if token is expired
function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true
  
  const expiryTime = new Date(expiresAt).getTime()
  const now = Date.now()
  
  // Consider token expired if it's within 5 minutes of expiry
  return now >= (expiryTime - 5 * 60 * 1000)
}

// Cron so we have to use GET
export async function GET(req: Request) {
//   Verify the secret token from Vercel
  const authorization = req.headers.get('authorization')
  if (authorization !== `Bearer ${cronSecret}`) {
    console.log('Auth failed. Expected:', cronSecret, 'Got:', authorization)
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
      }
    console.log(req)

  try {
    // Part 1: Update all users' top tracks
    const users = await getAllUsers()
    console.log(`Found ${users.length} users to update`)
    
    const updatedUsers: { id: string; username: string; tracks: number }[] = []
    const failedUsers: { id: string; username: string; reason: string }[] = []
    
    for (const user of users) {
      try {
        if (!user.refresh_token) {
          console.log(`User ${user.id} has no refresh token, skipping`)
          failedUsers.push({
            id: user.id,
            username: user.username,
            reason: 'No refresh token'
          })
          continue
        }
        
        let accessToken = user.access_token
        
        // Check if token is expired and refresh if needed
        if (isTokenExpired(user.token_expires_at) && user.refresh_token) {
          console.log(`Refreshing token for user ${user.id}`)
          try {
            const tokenData = await refreshSpotifyToken(user.refresh_token)
            
            // Update user with new tokens
            const { error: updateError } = await supabase
              .from('users')
              .update({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                token_expires_at: tokenData.expires_at
              })
              .eq('id', user.id)
            
            if (updateError) {
              console.error(`Failed to update user tokens for ${user.id}:`, updateError)
            }
            
            accessToken = tokenData.access_token
          } catch (tokenError) {
            console.error(`Failed to refresh token for user ${user.id}:`, tokenError)
            failedUsers.push({
              id: user.id,
              username: user.username,
              reason: 'Token refresh failed'
            })
            continue
          }
        }
        
        if (!accessToken) {
          console.log(`User ${user.id} has no access token after refresh attempt, skipping`)
          failedUsers.push({
            id: user.id,
            username: user.username,
            reason: 'No access token after refresh'
          })
          continue
        }
        
        // Fetch and save user's top tracks
        const topTracks = await fetchUserTopTracks(accessToken, user.id)
        if (topTracks) {
          updatedUsers.push({
            id: user.id,
            username: user.username,
            tracks: topTracks.length
          })
        } else {
          failedUsers.push({
            id: user.id,
            username: user.username,
            reason: 'No top tracks found'
          })
        }
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError)
        failedUsers.push({
          id: user.id,
          username: user.username,
          reason: userError instanceof Error ? userError.message : String(userError)
        })
      }
    }
    
    // Part 2: Set a random track as track of the day (original functionality)
    // Get all tracks
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('*')

    if (error) {
      console.error('Error fetching tracks:', error)
      return new Response(JSON.stringify({ 
        message: 'Error fetching tracks for track of day', 
        error: error.message,
        userUpdates: { success: updatedUsers, failed: failedUsers }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!tracks || tracks.length === 0) {
      console.log('No tracks found in database')
      return new Response(JSON.stringify({ 
        message: 'No tracks found for track of day',
        userUpdates: { success: updatedUsers, failed: failedUsers }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Pick a random track
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)]

    // Reset all tracks to not be track of day
    const { error: resetError } = await supabase
      .from('tracks')
      .update({ is_track_of_day: false })
      .filter('id', 'not.is', null)

    if (resetError) {
      console.error('Error resetting tracks:', resetError)
      return new Response(JSON.stringify({ 
        message: 'Error resetting tracks for track of day', 
        error: resetError.message,
        userUpdates: { success: updatedUsers, failed: failedUsers }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Set the selected track as track of the day
    const { error: updateError } = await supabase
      .from('tracks')
      .update({ is_track_of_day: true })
      .eq('id', randomTrack.id)

    if (updateError) {
      console.error('Error setting track of the day:', updateError)
      return new Response(JSON.stringify({ 
        message: 'Error setting track of the day', 
        error: updateError.message,
        userUpdates: { success: updatedUsers, failed: failedUsers }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      message: 'Track of the day updated successfully', 
      track: randomTrack,
      userUpdates: { 
        success: updatedUsers, 
        failed: failedUsers,
        summary: `Updated ${updatedUsers.length} users, failed ${failedUsers.length} users`
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error updating track of the day:', error)
    return new Response(JSON.stringify({ 
      message: 'Error updating track of the day', 
      error: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

