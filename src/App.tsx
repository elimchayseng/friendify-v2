import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppContent from './components/AppContent'
import WelcomePage from './components/WelcomePage'
import { supabase, saveUserTracks } from './lib/supabase'
import './App.css'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
            gcTime: 30 * 60 * 1000, // Keep unused data in cache for 30 minutes (replaces cacheTime)
        },
    },
})

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Get current session
                const { data, error } = await supabase.auth.getSession()
                if (error) {
                    console.error('Error getting session:', error)
                    setIsLoggedIn(false)
                    return
                }
    
                const isAuthenticated = !!data.session
                
                console.log('Auth check:', { isAuthenticated, session: data.session })
                
                if (isAuthenticated && data.session) {
                    // We have a session, let's set up the user
                    await handleSuccessfulLogin(data.session);
                }
                
                setIsLoggedIn(isAuthenticated)

                // Subscribe to auth changes
                const { data: authListener } = supabase.auth.onAuthStateChange(
                    async (event, session) => {
                        console.log('Auth changed:', { event, hasSession: !!session })
                        
                        // If this is a successful sign-in, setup user data after OAuth callback
                        if (event === 'SIGNED_IN' && session) {
                            await handleSuccessfulLogin(session)
                        }
                        
                        setIsLoggedIn(!!session)
                    }
                )

                return () => {
                    authListener.subscription.unsubscribe()
                }
            } catch (error) {
                console.error('Error checking auth:', error)
                setIsLoggedIn(false)
            }
        }
        
        checkAuth()
    }, [])
    
    // Function to handle successful Spotify OAuth sign in
    const handleSuccessfulLogin = async (session: any) => {
        try {
            console.log('Setting up user after successful OAuth login', session)
            
            // Get Spotify ID from session
            const spotifyId = session.user?.user_metadata?.provider_id
            if (!spotifyId) {
                console.error('No Spotify ID found in session')
                return
            }
            
            // Check if user already exists
            const { data: existingUser, error: fetchError } = await supabase
                .from('users')
                .select('id, username')
                .eq('spotify_id', spotifyId)
                .maybeSingle()
            
            if (fetchError) {
                console.error('Error fetching user from database', fetchError)
                return
            }
            console.log('Existing user:', existingUser)
            
            // epoch seconds to ISO string
            const expiresAt = new Date(session.expires_at * 1000).toISOString()
            
            if (!session.access_token) {
                console.error('No access token found in session')
                return
            }

            // Check if we need to fetch user profile (new user or username missing)
            let username = existingUser?.username
            if (!username) {
                // Fetch user profile from Spotify only if needed
                const userResponse = await fetch('https://api.spotify.com/v1/me', {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                })
                
                if (!userResponse.ok) {
                    console.error('Failed to fetch Spotify profile', await userResponse.text())
                    return
                }
                
                const userData = await userResponse.json()
                username = userData.display_name
            }
            
            // Create or update user in database
            const { data: dbUser, error: upsertError } = await supabase
                .from('users')
                .upsert({
                    spotify_id: spotifyId,
                    username,
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    token_expires_at: expiresAt
                }, {
                    onConflict: 'spotify_id'
                })
                .select()
                .single()
            
            if (upsertError || !dbUser) {
                console.error('Failed to create or update user in database', upsertError)
                return
            }
            
            console.log('Found user:', dbUser.id)
            
            // Check last time of track update (new user or tracks older than 24 hours)
            const { data: lastTrack, error: selectError } = await supabase
                .from('user_tracks')
                .select('last_updated_at')
                .eq('user_id', dbUser.id)
                .order('last_updated_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            
            if (selectError) {
                console.error('Error fetching last track update', selectError)
                return
            }
            console.log('Last track update:', lastTrack)
            
            const needsUpdate = !lastTrack ||
                (new Date().getTime() - new Date(lastTrack?.last_updated_at).getTime() > 24 * 60 * 60 * 1000)
            
            if (needsUpdate) {
                // Fetch and save top tracks
                const tracksResponse = await fetch(
                    'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5',
                    { headers: { 'Authorization': `Bearer ${session.access_token}` } }
                )
                
                if (!tracksResponse.ok) {
                    console.error('Failed to fetch top tracks', await tracksResponse.text())
                    return
                }
                
                const tracksData = await tracksResponse.json()
                if (tracksData.items?.length) {
                    try {
                        const savedTracks = await saveUserTracks(dbUser.id, tracksData.items)
                        queryClient.setQueryData(['tracks', dbUser.id], savedTracks)
                        queryClient.invalidateQueries({ queryKey: ['all-user-tracks'] })
                        console.log('User tracks saved:', savedTracks.length)
                    } catch (trackError) {
                        console.error('Error saving tracks:', trackError)
                    }
                }
            } else {
                console.log('Skipping track update - tracks are less than 24 hours old')
            }
        } catch (error) {
            console.error('Error handling successful login:', error)
        }
    }

    // While checking auth state, return loading
    if (isLoggedIn === null) {
        return <div className="loading">Loading...</div>
    }

    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={
                        isLoggedIn ? <AppContent /> : <WelcomePage />
                    } />        
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    )
}

export default App
