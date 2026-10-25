import { QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase.js'

export const handleSpotifyLogout = async (queryClient: QueryClient) => {
  // Sign out from Supabase
  const { error } = await supabase.auth.signOut()
  if (error) throw error

  // Clear all queries
  queryClient.clear()
}
