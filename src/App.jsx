import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TopTracks from './components/TopTracks'
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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    // If there's a code in the URL, exchange it for an access token
    if (code) {
      const verifier = localStorage.getItem('verifier');
      
      // Clear the URL parameters immediately to prevent reuse
      window.history.replaceState({}, document.title, "/");

      // Only proceed if we have a verifier
      if (!verifier) {
        console.log('No verifier found, skipping token exchange');
        return;
      }

      const params = new URLSearchParams();
      params.append("client_id", import.meta.env.VITE_SPOTIFY_CLIENT_ID);
      params.append("grant_type", "authorization_code");
      params.append("code", code);
      params.append("redirect_uri", import.meta.env.VITE_REDIRECT_URI);
      params.append("code_verifier", verifier);

      fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
      })
        .then(async response => {
          const data = await response.json();
          if (!response.ok) {
            // Don't show error for invalid_grant as it's likely just a page refresh
            if (data.error === 'invalid_grant') {
              console.log('Invalid grant - likely a page refresh or reused code');
              return null;
            }
            throw new Error(`${data.error_description || data.error}`);
          }
          return data;
        })
        .then(data => {
          if (data && data.access_token) {
            setToken(data.access_token);
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
            <TopTracks token={token} />
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
