import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAllUserTracks } from '../lib/supabase'
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

function TopTracks({ token, userId }: { token: string | null, userId: string | null }) {
  const [isLoading, setIsLoading] = useState(true)

  const { data: allUserTracks, error, isLoading: queryLoading } = useQuery<UserTracks[]>({
    queryKey: ['all-user-tracks'],
    queryFn: getAllUserTracks,
    staleTime: 300000, // 5 minutes
    gcTime: 1800000, // 30 minutes
    retry: 2,
    enabled: Boolean(token || localStorage.getItem('spotify_token')) // Only fetch when authenticated
  })

  useEffect(() => {
    if (!queryLoading) {
      setIsLoading(false)
    }
  }, [queryLoading])

  // Show login message if no authentication
  if (!token && !localStorage.getItem('spotify_token')) {
    return (
      <div className="tracks-wrapper">
        <div className="tracks-container">
          <div className="login-message">
            Please connect with Spotify to see everyone's top tracks
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tracks-wrapper">
        <div className="tracks-container">
          Error loading tracks: {(error as Error).message}
        </div>
      </div>
    )
  }

  if (isLoading || queryLoading) {
    return (
      <div className="tracks-wrapper">
        <div className="tracks-container">
          Loading tracks...
        </div>
      </div>
    )
  }

  if (!allUserTracks || !Array.isArray(allUserTracks) || allUserTracks.length === 0) {
    return (
      <div className="tracks-wrapper">
        <div className="tracks-container">
          <div className="no-tracks-message">
            No tracks found. Try listening to more music or invite your friends to join!
          </div>
        </div>
      </div>
    )
  }

  // Sort the current user's tracks to the top if we have a userId
  const sortedUserTracks = [...allUserTracks].sort((a, b) => {
    if (a.user.id === userId) return -1
    if (b.user.id === userId) return 1
    return 0
  })

  return (
    <div className="tracks-wrapper">
      <div className="tracks-container">
        <h2>Everyone's Top Tracks</h2>
        <div className="users-list">
          {sortedUserTracks.map((userTracks: UserTracks) => (
            <div key={userTracks.user.id} className="user-tracks-section">
              <h3 className="username">
                {userTracks.user.id === userId ? 'Your' : `${userTracks.user.username}'s`} Top Tracks
                {userTracks.user.id === userId && <span className="current-user-badge">You</span>}
              </h3>
              <div className="tracks-list">
                {userTracks.tracks.map((track: Track) => (
                  <div key={track.id} className="track-list-item">
                    <div className="track-rank">#{track.rank}</div>
                    
                    <a 
                      href={`https://open.spotify.com/track/${track.spotify_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="track-image-link"
                    >
                      {track.image_url ? (
                        <img 
                          src={track.image_url} 
                          alt={`${track.album} cover`} 
                          className="album-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="album-cover-placeholder">
                          <span>🎵</span>
                        </div>
                      )}
                    </a>
                    
                    <div className="track-details">
                      <div className="track-name">{track.name}</div>
                      <div className="track-artist">{track.artist}</div>
                      <div className="track-album">{track.album}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TopTracks 