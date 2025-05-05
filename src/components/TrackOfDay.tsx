import { useQuery } from '@tanstack/react-query'
import { useRef, forwardRef } from 'react'
import { supabase } from '../lib/supabase'
import './TrackOfDay.css'

interface Track {
  id: string
  name: string
  artist: string
  album: string
  image_url: string | null
  spotify_id: string
  user_tracks?: {
    users: {
      username: string
    }
  }[]
}

const TrackOfDay = forwardRef<HTMLDivElement>((props, ref) => {
  const { data: trackOfDay, isLoading, error } = useQuery<Track>({
    queryKey: ['trackOfDay'],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .single()

      if (error) throw error
      console.log('Track of day data:', data)
      return data as Track
    },
    // Cache the result for the whole day
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const handleTrackClick = (spotifyId: string) => {
    window.open(`https://open.spotify.com/track/${spotifyId}`, '_blank')
  }

  if (isLoading) {
    return (
      <div className="track-of-day-container" ref={ref}>
        <div className="track-header">
          <h2>Track of the Day</h2>
        </div>
        <p className="loading">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="track-of-day-container" ref={ref}>
        <div className="track-header">
          <h2>Track of the Day</h2>
        </div>
        <p className="error">Failed to load track of the day</p>
      </div>
    )
  }

  if (!trackOfDay) {
    return (
      <div className="track-of-day-container" ref={ref}>
        <div className="track-header">
          <h2>Track of the Day</h2>
        </div>
        <p>No track selected for today</p>
      </div>
    )
  }

  const username = trackOfDay.user_tracks?.[0]?.users?.username || 'Unknown User'

  return (
    <div className="track-of-day-container" ref={ref}>
      <div className="track-header">
        <h2>Track of the Day</h2>
        <div className="track-provider">
          <span className="from-text">From</span><span className="username">{username}</span>
        </div>
      </div>
      <div 
        className="track-of-day"
        onClick={() => handleTrackClick(trackOfDay.spotify_id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleTrackClick(trackOfDay.spotify_id)
          }
        }}
      >
        <div className="track-content">
          {trackOfDay.image_url && (
            <img
              src={trackOfDay.image_url}
              alt={`${trackOfDay.name} album art`}
              className="track-image"
            />
          )}
          <div className="track-info">
            <h3 className="track-name">{trackOfDay.name}</h3>
            <p className="artist">{trackOfDay.artist}</p>
            <p className="album">{trackOfDay.album}</p>
          </div>
        </div>
      </div>
    </div>
  )
})

export default TrackOfDay 