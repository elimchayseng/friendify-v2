import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUserTracks, getAllUserTracks } from '../lib/supabase'
import './TopTracks.css'

interface Track {
  id: string
  name: string
  artist: string
  album: string
  spotify_id: string
  rank: number
  image_url?: string | null
}

interface UserTracks {
  user: {
    id: string
    username: string
  }
  tracks: Track[]
}

function TopTracks({ token, userId }: { token: string, userId: string }) {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 3
  const RETRY_DELAY = 1000

  const { data: allUserTracks, error } = useQuery<UserTracks[]>({
    queryKey: ['all-user-tracks'],
    queryFn: getAllUserTracks,
    staleTime: 0,
    refetchOnMount: true
  })

  useEffect(() => {
    if (allUserTracks && allUserTracks.length > 0) {
      setIsLoading(false)
    }
  }, [allUserTracks])

  if (!userId) {
    return <div className="tracks-container">Waiting for user authentication...</div>
  }

  if (error) {
    return <div className="tracks-container">Error loading tracks: {(error as Error).message}</div>
  }

  if (isLoading) {
    return <div className="tracks-container">Loading tracks...</div>
  }

  if (!allUserTracks || allUserTracks.length === 0) {
    return <div className="tracks-container">No tracks found. Try listening to more music!</div>
  }

  return (
    <div className="tracks-container">
      <h2>Everyone's Top Tracks</h2>
      <div className="users-grid">
        {allUserTracks.map((userTracks) => (
          <div key={userTracks.user.id} className="user-tracks-section">
            <h3 className="username">{userTracks.user.username}'s Top Tracks</h3>
            <div className="tracks-grid">
              {userTracks.tracks.map((track) => (
                <div key={track.id} className="track-tile">
                  {track.image_url ? (
                    <img 
                      src={track.image_url} 
                      alt={`${track.album} cover`} 
                      className="album-cover"
                    />
                  ) : (
                    <div className="album-cover-placeholder">
                      <span>🎵</span>
                    </div>
                  )}
                  <div className="track-info">
                    <span className="track-rank">#{track.rank}</span>
                    <h4 className="track-name">{track.name}</h4>
                    <p className="track-artist">{track.artist}</p>
                    <p className="track-album">{track.album}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopTracks 