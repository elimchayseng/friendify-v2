import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import TopTracks from './TopTracks'
import TrackOfDay from './TrackOfDay'
import ChatReview from './ChatReview'
import { ErrorBoundary } from './ErrorBoundary'
import { handleSpotifyLogout } from '../lib/auth'
import { getAllUserTracks, supabase } from '../lib/supabase'
import './TrackReviewLayout.css'

function AppContent() {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const queryClient = useQueryClient()

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setIsLoading(true)
                
                // Get current session
                const { data: { session } } = await supabase.auth.getSession()
                
                if (!session) {
                    console.log('No active session found')
                    setIsLoading(false)
                    return
                }
                
                // Get user data from Supabase
                const { data: user } = await supabase
                    .from('users')
                    .select('id, username, spotify_id')
                    .eq('spotify_id', session.user.user_metadata.provider_id)
                    .single()
                
                if (user) {
                    setUserId(user.id)
                } else {
                    console.log('No user found in database')
                }
            } catch (err) {
                console.error('Error fetching user data:', err)
                setError('Failed to load user data. Please try logging in again.')
            } finally {
                setIsLoading(false)
            }
        }
        
        fetchUserData()
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
                { (
                    <button className="spotify-logout-button"
                        onClick={async () => {
                        await handleSpotifyLogout(queryClient);
                        setUserId(null);
                        setError(null);
                        window.location.href = '/';
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
                ) : (
                    <ErrorBoundary>
                        <div className="track-review-container">
                            <div style={{ width: '450px', maxWidth: '45%' }}>
                                <TrackOfDay />
                            </div>
                            <div style={{ width: '450px', maxWidth: '45%' }}>
                                <ChatReview />
                            </div>
                        </div>
                        <TopTracks userId={userId} />
                    </ErrorBoundary>
                ) }
            </main>
        </div>
    )
}

export default AppContent 