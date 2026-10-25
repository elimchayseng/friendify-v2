import { useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import Starfield from './ipod/Starfield'
import { SpotifyIcon } from './ipod/Icons'
import './ipod/Collection.css'
import './ipod/Space.css'
import './WelcomePage.css'

export default function WelcomePage() {
  const [error, setError] = useState('')
  const [connecting, setConnecting] = useState(false)
  const login = async () => {
    setError('')
    if (!isSupabaseConfigured) {
      setError(
        'Spotify sign-in is temporarily unavailable. Please try again later.'
      )
      return
    }
    setConnecting(true)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'spotify',
        options: {
          scopes: 'user-top-read user-read-email',
          redirectTo: window.location.origin,
        },
      })
      if (error) throw error
      if (!data.url)
        throw new Error('Couldn’t connect to Spotify. Please try again.')
    } catch {
      setError('Couldn’t connect to Spotify. Please try again.')
      setConnecting(false)
    }
  }
  return (
    <div className="app collection-app sign-in-app">
      <Starfield />
      <a href="#sign-in" className="skip-link">
        Skip to sign in
      </a>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Friendify home">
          <span className="logo-box" aria-hidden="true" />
          friendify
        </a>
      </header>
      <main id="sign-in" className="sign-in-main">
        <section className="sign-in-panel" aria-labelledby="sign-in-title">
          <span className="sign-in-ipod" aria-hidden="true">
            <span>
              friendify<i>Not connected</i>
            </span>
            <b />
          </span>
          <h1 id="sign-in-title">Connect to Spotify.</h1>
          <p>Sign in to load your top five and your friends’ iPods.</p>
          <button
            className="aqua-button sign-in-button"
            onClick={() => void login()}
            disabled={connecting}
            aria-busy={connecting}
          >
            <SpotifyIcon />
            {connecting ? 'Connecting…' : 'Sign in with Spotify'}
            <span aria-hidden="true">↗</span>
          </button>
          {error && (
            <p className="sign-in-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </main>
      <footer className="app-footer">
        <span>
          <i className="status-dot" />
          Your music. Your people.
        </span>
        <span className="footer-label">POWERED BY SPOTIFY</span>
      </footer>
    </div>
  )
}
