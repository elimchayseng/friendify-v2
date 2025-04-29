import { useQuery } from '@tanstack/react-query'
import { getUserTracks } from '../lib/supabase'

function TopTracks({ token, userId }) {
  const { data: tracks, isLoading, error } = useQuery({
    queryKey: ['tracks', userId],
    queryFn: () => getUserTracks(userId),
    enabled: !!userId
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="tracks-container">
      <h2>Your Top Tracks</h2>
      <div className="tracks-grid">
        {tracks?.map((userTrack) => {
          const track = userTrack.tracks
          return (
            <div key={track.id} className="track-card">
              {track.image_url && (
                <img
                  src={track.image_url}
                  alt={`${track.name} album art`}
                  className="track-image"
                />
              )}
              <div className="track-info">
                <h3>{track.name}</h3>
                <p>{track.artist}</p>
                <p className="album-name">{track.album}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TopTracks 