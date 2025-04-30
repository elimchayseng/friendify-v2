import { useState, useEffect, Component } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import TopTracks from './components/TopTracks.tsx'
import { createOrUpdateUser, saveUserTracks, getAllUserTracks } from './lib/supabase'
import SupabaseTest from './components/SupabaseTest'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      cacheTime: 30 * 60 * 1000, // Keep unused data in cache for 30 minutes
    },
  },
})

// Function to generate code verifier
const generateCodeVerifier = (length) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Function to generate code challenge
const generateCodeChallenge = async (codeVerifier) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  // Convert the digest to base64url format
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

function AppContent() {
  const [token, setToken] = useState(() => {
    return localStorage.getItem('spotify_token') || null
  })
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(() => {
    return localStorage.getItem('user_id') || null
  })
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  // Effect to validate stored token on mount
  useEffect(() => {
    const validateStoredToken = async () => {
      const storedToken = localStorage.getItem('spotify_token')
      if (!storedToken) return

      try {
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        })

        if (!response.ok) {
          // Token is invalid, clear storage and state
          handleLogout()
        }
      } catch (error) {
        console.error('Error validating token:', error)
        handleLogout()
      }
    }

    validateStoredToken()
  }, [])

  // Effect to handle stored user data on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id')
    const storedUsername = localStorage.getItem('username')
    
    if (storedUserId && storedUsername) {
      setUserId(storedUserId)
      // Prefetch tracks data if we have a stored userId
      queryClient.prefetchQuery({
        queryKey: ['all-user-tracks'],
        queryFn: getAllUserTracks,
      })
    }
  }, [queryClient])

  useEffect(() => {
    console.log('App mounted, checking URL parameters')
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    console.log('Code from URL:', code ? 'Present' : 'Not present')

    if (code) {
      setIsLoading(true)
      const verifier = localStorage.getItem('verifier')
      console.log('Verifier from localStorage:', verifier ? 'Present' : 'Not present')
      
      window.history.replaceState({}, document.title, "/")

      if (!verifier) {
        console.log('No verifier found, skipping token exchange')
        setIsLoading(false)
        return
      }

      console.log('Starting token exchange with Spotify')
      const params = new URLSearchParams()
      params.append("client_id", import.meta.env.VITE_SPOTIFY_CLIENT_ID)
      params.append("grant_type", "authorization_code")
      params.append("code", code)
      params.append("redirect_uri", import.meta.env.VITE_REDIRECT_URI)
      params.append("code_verifier", verifier)

      fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
      })
        .then(async response => {
          console.log('Token exchange response status:', response.status)
          const data = await response.json()
          if (!response.ok) {
            console.log('Token exchange error:', data)
            if (data.error === 'invalid_grant') {
              console.log('Invalid grant - likely a page refresh or reused code')
              return null
            }
            throw new Error(`${data.error_description || data.error}`)
          }
          return data
        })
        .then(async data => {
          if (data && data.access_token) {
            // Store token in localStorage
            localStorage.setItem('spotify_token', data.access_token)
            setToken(data.access_token)
            
            // Get user profile from Spotify
            const userResponse = await fetch('https://api.spotify.com/v1/me', {
              headers: { 'Authorization': `Bearer ${data.access_token}` }
            })
            const userData = await userResponse.json()
            
            // Save user to database and localStorage
            const dbUser = await createOrUpdateUser(userData.display_name, userData.id)
            localStorage.setItem('user_id', dbUser.id)
            localStorage.setItem('username', userData.display_name)
            
            // Get top tracks
            console.log('Fetching top tracks from Spotify...')
            const tracksResponse = await fetch(
              'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5',
              {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
              }
            )
            const tracksData = await tracksResponse.json()
            console.log('Spotify top tracks response:', tracksData)
            
            if (!tracksData.items?.length) {
              console.log('No top tracks found in the last 4 weeks')
              setError('No top tracks found in the last 4 weeks. Try listening to more music!')
              setIsLoading(false)
              return
            }
            
            try {
              const savedTracks = await saveUserTracks(dbUser.id, tracksData.items)
              console.log('Tracks saved successfully:', savedTracks)
              
              queryClient.setQueryData(['tracks', dbUser.id], savedTracks)
              setUserId(dbUser.id)
              await queryClient.invalidateQueries({ queryKey: ['all-user-tracks'] })
            } catch (error) {
              console.error('Error saving tracks:', error)
              setError(`Failed to save tracks: ${error.message}`)
            }
          }
        })
        .catch(error => {
          console.error('Token exchange error:', error)
          setError(`Authentication failed: ${error.message}`)
        })
        .finally(() => {
          localStorage.removeItem('verifier')
          setIsLoading(false)
        })
    }
  }, [queryClient])

  const handleLogin = async () => {
    const verifier = generateCodeVerifier(128)
    const challenge = await generateCodeChallenge(verifier)
    localStorage.setItem('verifier', verifier)
    console.log('Client ID:', import.meta.env.VITE_SPOTIFY_CLIENT_ID)

    const params = new URLSearchParams()
    params.append("client_id", import.meta.env.VITE_SPOTIFY_CLIENT_ID)
    params.append("response_type", "code")
    params.append("redirect_uri", import.meta.env.VITE_REDIRECT_URI)
    params.append("scope", "user-top-read")
    params.append("code_challenge_method", "S256")
    params.append("code_challenge", challenge)

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`
    console.log('Authorization URL:', authUrl)
    window.location = authUrl
  }

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem('spotify_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('username')
    localStorage.removeItem('verifier')
    
    // Clear state
    setToken(null)
    setUserId(null)
    setError(null)
    
    // Clear query cache
    queryClient.clear()
  }

  return (
    <div className="app-container">
      <header>
        <h1>
          <span role="img" aria-label="flame">🔥</span>
          {"Friendify"}
          <span role="img" aria-label="flame">🔥</span>
        </h1>
        {!token ? (
          <button onClick={handleLogin} disabled={isLoading}>
            {isLoading ? 'Connecting...' : 'Connect with Spotify'}
          </button>
        ) : (
          <button onClick={handleLogout}>Logout</button>
        )}
      </header>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <main>
        {isLoading ? (
          <div>Connecting to Spotify...</div>
        ) : (
          <ErrorBoundary>
            <TopTracks token={token} userId={userId} />
          </ErrorBoundary>
        )}
      </main>
      <SupabaseTest userId={userId} />
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App
