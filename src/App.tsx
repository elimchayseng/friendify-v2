import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import AppContent from './components/AppContent'
import WelcomePage from './components/WelcomePage'
import { supabase, saveUserTracks, isSupabaseConfigured } from './lib/supabase'
import { saveSpotifyProfile } from './lib/spotify-profile'
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
    if (!isSupabaseConfigured) {
      setIsLoggedIn(false)
      return
    }
    let active = true
    let setupToken = ''
    let setup: Promise<void> | undefined
    let authVersion = 0
    const applySession = async (session: Session | null) => {
      const version = ++authVersion
      if (session && setupToken !== session.access_token) {
        setupToken = session.access_token
        setup = handleSuccessfulLogin(session)
      }
      if (session) await setup
      if (active && version === authVersion) setIsLoggedIn(Boolean(session))
    }
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          if (active) setIsLoggedIn(false)
          return
        }
        void applySession(data.session)
      })
      .catch(() => {
        if (active) setIsLoggedIn(false)
      })
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Leave the auth callback before making further Supabase requests.
        if (event === 'SIGNED_IN')
          setTimeout(() => {
            if (active) void applySession(session)
          }, 0)
        else if (event !== 'INITIAL_SESSION' && active) {
          authVersion++
          setIsLoggedIn(Boolean(session))
        }
      }
    )
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // Function to handle successful Spotify OAuth sign in
  const handleSuccessfulLogin = async (session: Session) => {
    try {
      // Get Spotify ID from session
      const spotifyId = session.user?.user_metadata?.provider_id
      if (!spotifyId) {
        console.error('No Spotify ID found in session')
        return
      }

      // Check if user already exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, username, access_token, token_expires_at')
        .eq('spotify_id', spotifyId)
        .maybeSingle()

      if (fetchError) {
        console.error('Error fetching user from database', fetchError)
        return
      }

      // Get token - always upsert to ensure we have current tokens
      const accessToken = session.provider_token
      if (!accessToken) {
        console.error('No provider token available')
        return
      }

      // epoch seconds to ISO string
      const expiresAt = new Date(
        (session.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000
      ).toISOString()

      // Check if we need to fetch user profile (new user or username missing)
      let username = existingUser?.username
      if (!username) {
        // Fetch user profile from Spotify only if needed
        const userResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (!userResponse.ok) {
          console.error(
            'Failed to fetch Spotify profile',
            await userResponse.text()
          )
          return
        }

        const userData = await userResponse.json()
        username = userData.display_name || spotifyId
      }

      // Always upsert user to ensure we have current tokens
      const { data: dbUser, error: upsertError } = await saveSpotifyProfile(
        supabase,
        {
          spotify_id: spotifyId,
          username,
          access_token: accessToken,
          refresh_token: session.provider_refresh_token,
          token_expires_at: expiresAt,
        }
      )

      if (upsertError || !dbUser) {
        console.error('Failed to upsert user in database', upsertError)
        return
      }

      console.log('User updated:', dbUser.id)

      // Only fetch tracks for new users
      if (!existingUser) {
        console.log('New user - fetching initial tracks')
        const tracksResponse = await fetch(
          'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (!tracksResponse.ok) {
          console.error(
            'Failed to fetch top tracks',
            await tracksResponse.text()
          )
          return
        }

        const tracksData = await tracksResponse.json()
        if (tracksData.items?.length) {
          try {
            const savedTracks = await saveUserTracks(
              dbUser.id,
              tracksData.items
            )
            queryClient.setQueryData(['tracks', dbUser.id], savedTracks)
            queryClient.invalidateQueries({ queryKey: ['all-user-tracks'] })
            console.log(
              'Initial tracks saved for new user:',
              savedTracks.length
            )
          } catch (trackError) {
            console.error('Error saving initial tracks:', trackError)
          }
        }
      } else {
        console.log(
          'Existing user - skipping track fetch, cron job will handle updates'
        )
      }
    } catch (error) {
      console.error('Error handling successful login:', error)
    }
  }

  // While checking auth state, return loading
  if (isLoggedIn === null) {
    return (
      <div className="loading-screen" role="status">
        <span className="mini-player-loader" aria-hidden="true" />
        <p>Loading your collection…</p>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={isLoggedIn ? <AppContent /> : <WelcomePage />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
