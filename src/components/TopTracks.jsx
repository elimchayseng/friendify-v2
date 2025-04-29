import { useQuery } from '@tanstack/react-query'

function TopTracks({ token }) {
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch user profile')
      }
      return response.json()
    }
  })

  const { data: tracks, isLoading, error } = useQuery({
    queryKey: ['topTracks'],
    queryFn: async () => {
      const response = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch tracks')
      }
      return response.json()
    }
  })

  if (isLoading) return <div className="loading">Loading your top tracks...</div>
  if (error) return <div className="error">Error: {error.message}</div>

  // Select a random track for Track of the Day
  const trackOfTheDay = tracks?.items?.[Math.floor(Math.random() * tracks.items.length)]

  return (
    <div className="tracks-container">
      {trackOfTheDay && (
        <div className="track-of-the-day">
          <h3>Track of the Day</h3>
          <div className="featured-track">
            <img 
              src={trackOfTheDay.album.images[0]?.url} 
              alt={trackOfTheDay.name}
              className="featured-track-image"
            />
            <div className="featured-track-info">
              <h4>{trackOfTheDay.name}</h4>
              <p>{trackOfTheDay.artists[0].name}</p>
            </div>
            <a 
              href={trackOfTheDay.external_urls.spotify} 
              target="_blank" 
              rel="noopener noreferrer"
              className="spotify-link-button"
            >
              Open in Spotify
            </a>
          </div>
        </div>
      )}

      {userProfile && (
        <h2 className="profile-name">{userProfile.display_name}'s Top Tracks This Month</h2>
      )}

      <div className="tracks-grid">
        {tracks?.items?.map((track) => (
          <a 
            key={track.id} 
            href={track.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="track-card"
          >
            <img 
              src={track.album.images[0]?.url} 
              alt={track.name}
              className="track-image"
            />
            <div className="track-info">
              <h3>{track.name}</h3>
              <p>{track.artists[0].name}</p>
              <button className="minimal-play-button" aria-label="Play on Spotify">
                <div className="play-icon"></div>
              </button>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

export default TopTracks 