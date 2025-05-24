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

interface TrackOfDayProps {
  trackData?: Track | null
}

export default function TrackOfDay({ trackData }: TrackOfDayProps) {
  const trackOfDay = trackData

  const handleTrackClick = (spotifyId: string) => {
    window.open(`https://open.spotify.com/track/${spotifyId}`, '_blank')
  }


  if (!trackOfDay) {
    return (
      <div className="track-of-day-container">
        <h2>Track of the Day</h2>
        <p>No track selected for today</p>
      </div>
    )
  }

  const username = trackOfDay.user_tracks?.[0]?.users?.username || 'Unknown User'

  return (
    <div className="track-of-day-container">
      <h2>Track of the Day</h2>
      <h3>Brought to you by {username}</h3>
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
} 