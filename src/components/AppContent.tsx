import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { handleSpotifyLogout } from '../lib/auth'
import { supabase } from '../lib/supabase'
import IpodCollection from './ipod/IpodCollection'
import TrackOfDay from './TrackOfDay'
import TrackReactions from './TrackReactions'
import { ErrorBoundary } from './ErrorBoundary'
import './TrackReviewLayout.css'
const SHOW_TRACK_OF_DAY_FEATURES = false
type DailyTrack = NonNullable<Parameters<typeof TrackOfDay>[0]['trackData']>
export default function AppContent() {
  const [userId, setUserId] = useState<string | null>(null),
    [username, setUsername] = useState('friend'),
    [loading, setLoading] = useState(true),
    [signingOut, setSigningOut] = useState(false),
    [error, setError] = useState<string | null>(null),
    [daily, setDaily] = useState<DailyTrack | null>(null)
  const client = useQueryClient()
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) return
        const { data: user, error } = await supabase
          .from('users')
          .select('id, username, spotify_id')
          .eq('spotify_id', session.user.user_metadata.provider_id)
          .single()
        if (error) throw error
        if (user && active) {
          setUserId(user.id)
          setUsername(user.username)
        }
        if (SHOW_TRACK_OF_DAY_FEATURES) {
          const { data, error } = await supabase
            .from('tracks')
            .select('*, user_tracks!inner(users!inner(username))')
            .eq('is_track_of_day', true)
            .maybeSingle()
          if (error) throw error
          if (active) setDaily(data as unknown as DailyTrack | null)
        }
      } catch {
        if (active)
          setError(
            'We couldn’t load your profile. Please refresh, or reconnect to Spotify.'
          )
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])
  const logout = async () => {
    setSigningOut(true)
    try {
      await handleSpotifyLogout(client)
      window.location.href = '/'
    } catch {
      setError('Couldn’t sign out. Please try again.')
      setSigningOut(false)
    }
  }
  return (
    <ErrorBoundary>
      <IpodCollection
        userId={userId}
        username={username}
        profileLoading={loading}
        signingOut={signingOut}
        onLogout={logout}
        error={error}
        onDismissError={() => setError(null)}
      />
      {SHOW_TRACK_OF_DAY_FEATURES && (
        <div className="track-review-container">
          <TrackOfDay trackData={daily} />
          <TrackReactions trackId={daily?.id} />
        </div>
      )}
    </ErrorBoundary>
  )
}
