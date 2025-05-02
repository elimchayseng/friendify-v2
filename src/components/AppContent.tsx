import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import TopTracks from './TopTracks'
import TrackOfDay from './TrackOfDay'
import { ErrorBoundary } from './ErrorBoundary'
import { handleSpotifyLogin, handleSpotifyLogout, exchangeCodeForToken } from '../lib/auth'
import { getAllUserTracks } from '../lib/supabase'

function AppContent() {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('spotify_token') || null)
    const [error, setError] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(() => localStorage.getItem('user_id') || null)
    const [isLoading, setIsLoading] = useState(false)
    const queryClient = useQueryClient()

    useEffect(() => {
        const validateStoredToken = async () => {
            const storedToken = localStorage.getItem('spotify_token')
            if (!storedToken) return

            try {
                const response = await fetch('https://api.spotify.com/v1/me', {
                    headers: { 'Authorization': `Bearer ${storedToken}` }
                })

                if (!response.ok) {
                    handleSpotifyLogout(queryClient)
                }
            } catch (error) {
                console.error('Error validating token:', error)
                handleSpotifyLogout(queryClient)
            }
        }

        validateStoredToken()
    }, [queryClient])

    useEffect(() => {
        const storedUserId = localStorage.getItem('user_id')
        const storedUsername = localStorage.getItem('username')

        if (storedUserId && storedUsername) {
            setUserId(storedUserId)
            queryClient.prefetchQuery({
                queryKey: ['all-user-tracks'],
                queryFn: getAllUserTracks,
            })
        }
    }, [queryClient])

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')

        if (code) {
            setIsLoading(true)
            const verifier = localStorage.getItem('verifier')
            window.history.replaceState({}, document.title, "/")

            if (!verifier) {
                setError('No verifier found in localStorage. Please try logging in again.')
                setIsLoading(false)
                return
            }

            exchangeCodeForToken(code, verifier, setToken, setUserId, setError, queryClient)
                .catch(() => {}) // Error is already handled in exchangeCodeForToken
                .finally(() => {
                    localStorage.removeItem('verifier')
                    setIsLoading(false)
                })
        }
    }, [queryClient])

    return (
        <div className="app-container">
            <header>
                <div className="footer-text-container">
                    <div className="footer-link" onClick={() => window.location.reload()}>
                        <h2 className="metallic-text" data-text="Friendify">Friendify</h2>
                    </div>
                    <div className="creator-container">
                        <a href="https://www.limchayseng.com/" target="_blank" rel="noopener noreferrer" className="footer-link">
                            <span className="creator-text">by Ethan and Tres ❤️</span>
                        </a>
                        <img src="/images/skull-ethan-logo.png" alt="Ethan's skull logo" className="creator-logo" />
                    </div>
                </div>
                {!token && !isLoading && (
                    <button onClick={() => handleSpotifyLogin(setError)}>
                        Connect with Spotify
                    </button>
                )}
                {token && (
                    <button onClick={() => {
                        handleSpotifyLogout(queryClient);
                        setToken(null);
                        setUserId(null);
                        setError(null);
                    }}>Logout</button>
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
                        <TrackOfDay />
                        <TopTracks token={token} userId={userId} />
                    </ErrorBoundary>
                ) : (
                    <div className="landing-message">
                        <p>✨ Please connect with Spotify to see everyone's top tracks ✨</p>
                    </div>
                )}
            </main>
        </div>
    )
}

export default AppContent 