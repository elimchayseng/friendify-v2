import { QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

export const handleSpotifyLogout = async (queryClient: QueryClient) => {
    // Sign out from Supabase
    await supabase.auth.signOut()
    
    // Clear all queries
    queryClient.clear()
}

export async function refreshSpotifyToken(refreshToken: string) {
    try {
      const params = new URLSearchParams()
      params.append("client_id", import.meta.env.VITE_SPOTIFY_CLIENT_ID)
      params.append("grant_type", "refresh_token")
      params.append("refresh_token", refreshToken)
  
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
