import { useState, useEffect, Component } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import TopTracks from './components/TopTracks.tsx'
import { createOrUpdateUser, saveUserTracks } from './lib/supabase'
import SupabaseTest from './components/SupabaseTest'
import './App.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

// Function to generate code verifier
const generateCodeVerifier = (length) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Function to generate code challenge
const generateCodeChallenge = async (codeVerifier) => {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
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
  const [token, setToken] = useState(null)
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    console.log('App mounted, checking URL parameters');
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    console.log('Code from URL:', code ? 'Present' : 'Not present');

    // If there's a code in the URL, exchange it for an access token
    if (code) {
      setIsLoading(true);
      const verifier = localStorage.getItem('verifier');
      console.log('Verifier from localStorage:', verifier ? 'Present' : 'Not present');
      
      // Clear the URL parameters immediately to prevent reuse
      window.history.replaceState({}, document.title, "/");

      // Only proceed if we have a verifier
      if (!verifier) {
        console.log('No verifier found, skipping token exchange');
        setIsLoading(false);
        return;
      }

      console.log('Starting token exchange with Spotify');
      const params = new URLSearchParams();
      params.append("client_id", import.meta.env.VITE_SPOTIFY_CLIENT_ID);
      params.append("grant_type", "authorization_code");
      params.append("code", code);
      params.append("redirect_uri", import.meta.env.VITE_REDIRECT_URI);
      params.append("code_verifier", verifier);

      console.log('Token exchange parameters:', {
        client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
        redirect_uri: import.meta.env.VITE_REDIRECT_URI
      });

      fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
      })
        .then(async response => {
          console.log('Token exchange response status:', response.status);
          const data = await response.json();
          if (!response.ok) {
            console.log('Token exchange error:', data);
            if (data.error === 'invalid_grant') {
              console.log('Invalid grant - likely a page refresh or reused code');
              return null;
            }
            throw new Error(`${data.error_description || data.error}`);
          }
          return data;
        })
        .then(async data => {
          if (data && data.access_token) {
            setToken(data.access_token);
            
            // Get user profile from Spotify
            const userResponse = await fetch('https://api.spotify.com/v1/me', {
              headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            const userData = await userResponse.json();
            
            // Save user to database
            const dbUser = await createOrUpdateUser(userData.display_name, userData.id);
            
            // Get top tracks from the last 4 weeks (short_term)
            console.log('Fetching top tracks from Spotify...');
            const tracksResponse = await fetch(
              'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5',
              {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
              }
            );
            const tracksData = await tracksResponse.json();
            console.log('Spotify top tracks response:', tracksData);
            
            if (!tracksData.items?.length) {
              console.log('No top tracks found in the last 4 weeks');
              setError('No top tracks found in the last 4 weeks. Try listening to more music!');
              setIsLoading(false);
              return;
            }
            
            // Save tracks to database
            console.log('Saving tracks to database...', tracksData.items);
            try {
              const savedTracks = await saveUserTracks(dbUser.id, tracksData.items);
              console.log('Tracks saved successfully:', savedTracks);
              
              // Set the tracks data in the cache before setting userId
              queryClient.setQueryData(['tracks', dbUser.id], savedTracks);
              
              // Now set the userId to trigger the TopTracks component
              setUserId(dbUser.id);
              
              // Invalidate the query to ensure fresh data
              await queryClient.invalidateQueries({ queryKey: ['tracks', dbUser.id] });
            } catch (error) {
              console.error('Error saving tracks:', error);
              setError(`Failed to save tracks: ${error.message}`);
            }
          }
        })
        .catch(error => {
          console.error('Token exchange error:', error);
          setError(`Authentication failed: ${error.message}`);
        })
        .finally(() => {
          // Clean up verifier and loading state
          localStorage.removeItem('verifier');
          setIsLoading(false);
        });
    }
  }, [queryClient]);

  const handleLogin = async () => {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);
    
    // Store verifier in localStorage to use later
    localStorage.setItem('verifier', verifier);

    // Log the client ID to make sure it exists
    console.log('Client ID:', import.meta.env.VITE_SPOTIFY_CLIENT_ID);

    const params = new URLSearchParams();
    params.append("client_id", import.meta.env.VITE_SPOTIFY_CLIENT_ID);
    params.append("response_type", "code");
    params.append("redirect_uri", import.meta.env.VITE_REDIRECT_URI);
    params.append("scope", "user-top-read");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    // Log the full URL for debugging
    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    console.log('Authorization URL:', authUrl);

    window.location = authUrl;
  }

  const handleLogout = () => {
    setToken(null)
    setError(null)
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
        ) : token ? (
          <ErrorBoundary>
            <TopTracks token={token} userId={userId} />
          </ErrorBoundary>
        ) : (
          <div className="login-message">
            Please login with Spotify to see your top tracks
          </div>
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
