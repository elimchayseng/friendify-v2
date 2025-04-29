import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TopTracks from './components/TopTracks'
import { createOrUpdateUser, saveUserTracks } from './lib/supabase'
import './App.css'

const queryClient = new QueryClient()

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

function App() {
  const [token, setToken] = useState(null)
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    console.log('App mounted, checking URL parameters');
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    console.log('Code from URL:', code ? 'Present' : 'Not present');

    // If there's a code in the URL, exchange it for an access token
    if (code) {
      const verifier = localStorage.getItem('verifier');
      console.log('Verifier from localStorage:', verifier ? 'Present' : 'Not present');
      
      // Clear the URL parameters immediately to prevent reuse
      window.history.replaceState({}, document.title, "/");

      // Only proceed if we have a verifier
      if (!verifier) {
        console.log('No verifier found, skipping token exchange');
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
            setUserId(dbUser.id);

            // Get top tracks and save them
            const tracksResponse = await fetch('https://api.spotify.com/v1/me/top/tracks', {
              headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            const tracksData = await tracksResponse.json();
            
            // Save tracks to database
            await saveUserTracks(dbUser.id, tracksData.items);
          }
        })
        .catch(error => {
          console.error('Token exchange error:', error);
          setError(`Authentication failed: ${error.message}`);
        })
        .finally(() => {
          // Clean up verifier
          localStorage.removeItem('verifier');
        });
    }
  }, []);

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
    <QueryClientProvider client={queryClient}>
      <div className="app-container">
        <header>
          <h1>
          <span role="img" aria-label="flame">🔥</span>
            {"Friendify"}
            <span role="img" aria-label="flame">🔥</span>
          </h1>
          {!token ? (
            <button onClick={handleLogin}>Connect with Spotify</button>
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
          {token ? (
            <TopTracks token={token} userId={userId} />
          ) : (
            <div className="login-message">
              Please login with Spotify to see your top tracks
            </div>
          )}
        </main>
      </div>
    </QueryClientProvider>
  )
}

export default App
