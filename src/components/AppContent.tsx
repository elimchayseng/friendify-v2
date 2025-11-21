import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import TopTracks from './TopTracks'
import TrackOfDay from './TrackOfDay'
import TrackReactions from './TrackReactions'
import { ErrorBoundary } from './ErrorBoundary'
import { handleSpotifyLogout } from '../lib/auth'
import { supabase } from '../lib/supabase'
import './TrackReviewLayout.css'

// Feature flag for the Track of the Day + reactions block
const SHOW_TRACK_OF_DAY_FEATURES = false

function AppContent() {
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)
    const [trackOfDay, setTrackOfDay] = useState<any>(null)
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
                
                if (SHOW_TRACK_OF_DAY_FEATURES) {
                    // Get track of the day
                    const { data: trackOfDayData, error: trackError } = await supabase
                        .from('tracks')
                        .select(`
                            *,
                            user_tracks!inner (
                              users!inner (
                                username
                              )
                            )
                          `)
                        .eq('is_track_of_day', true)
                        .maybeSingle()
                    
                    if (trackError) {
                        console.error('Error fetching track of day:', trackError);
                    }
                    
                    if (trackOfDayData) {
                        setTrackOfDay(trackOfDayData);
                    }
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
                        {SHOW_TRACK_OF_DAY_FEATURES && (
                            <div className="track-review-container">
                                <div className="track-component">
                                    {trackOfDay ? (
                                        <TrackOfDay trackData={trackOfDay} />
                                    ) : (
                                        <div className="track-of-day-container">
                                            <h2>Track of the Day</h2>
                                            <p>No track selected for today</p>
                                        </div>
                                    )}
                                </div>
                                <div className="chat-component">
                                    <TrackReactions trackId={trackOfDay?.id} />
                                </div>
                            </div>
                        )}
                        <TopTracks userId={userId} />
                    </ErrorBoundary>
                ) }
            </main>
        </div>
    )
}

export default AppContent 
