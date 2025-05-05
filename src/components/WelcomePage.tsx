import { useState } from 'react'
import { supabase } from '../lib/supabase'
import '../App.css'
import './WelcomePage.css'

function WelcomePage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleSpotifyLogin = async () => {
    try {
      setIsLoggingIn(true)
      setError(null)
      
      const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'spotify',
          options: {
              scopes: 'user-top-read user-read-email',
              redirectTo: `${window.location.origin}`
          }
      })
      
      if (error) {
        console.error('Error initiating Spotify login:', error)
        setError(error.message)
      } else if (!data) {
        setError('Failed to initialize login. Please try again.')
      }
    } catch (err) {
      console.error('Exception during login setup:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="welcome-container">
      <main>
        <div className="welcome-content">
          <h1 className="metallic-text" data-text="Friendify">Friendify</h1>
          <p>See what your friends are listening to</p>
          
          <button 
            className="spotify-login-button"
            onClick={handleSpotifyLogin}
            disabled={isLoggingIn}
          >
            <img src="/spotify-icon.svg" alt="Spotify" className="spotify-icon" />
            {isLoggingIn ? 'Connecting...' : 'Log in with Spotify'}
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="creator-info">
            <span className="creator-text">by Ethan and Tres ❤️</span>
            <img src="/images/skull-ethan-logo.png" alt="Ethan's skull logo" className="creator-logo" />
          </div>
        </div>
      </main>
    </div>
  )
}

export default WelcomePage