import { QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase.js'

export const handleSpotifyLogout = async (queryClient: QueryClient) => {
    // Sign out from Supabase
    await supabase.auth.signOut()
    
    // Clear all queries
    queryClient.clear()
}


