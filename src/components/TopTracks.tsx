import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUserTracks } from '../lib/supabase'

interface Track {
  id: string
  name: string
  artist: string
  album: string
  image_url: string
  spotify_id: string
  rank: number
}

function TopTracks({ token, userId }: { token: string, userId: string }) {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const MAX_RETRIES = 3
  const RETRY_DELAY = 1000 // 1 second

  // Get any existing tracks data from the cache
  const existingData = queryClient.getQueryData<Track[]>(['tracks', userId])

  const { data: tracks, error, refetch } = useQuery<Track[]>({
    queryKey: ['tracks', userId],
    queryFn: async () => {
      try {
        const result = await getUserTracks(userId)
        console.log('Raw tracks result:', result)
        if (!result || !Array.isArray(result)) {
          console.warn('Unexpected tracks result format:', result)
          return []
        }
        return result
      } catch (err) {
        console.error('Error fetching tracks:', err)
        return []
      }
    },
    enabled: !!userId,
    retry: false, // We'll handle retries manually
    staleTime: 0, // Consider data stale immediately
    initialData: existingData, // Use any existing data from cache
    refetchOnMount: true // Always refetch on mount
  })

  useEffect(() => {
    if ((!tracks || tracks.length === 0) && userId && retryCount < MAX_RETRIES) {
      // If no tracks found, wait and retry
      const timer = setTimeout(() => {
        console.log(`Retrying fetch tracks (attempt ${retryCount + 1})...`)
        refetch()
        setRetryCount(prev => prev + 1)
      }, RETRY_DELAY)

      return () => clearTimeout(timer)
    }
    
    if (tracks && tracks.length > 0) {
      setIsLoading(false)
    } else if (retryCount >= MAX_RETRIES) {
      setIsLoading(false)
    }
  }, [tracks, userId, retryCount, refetch])

  // Reset retry count when userId changes
  useEffect(() => {
    setRetryCount(0)
    setIsLoading(true)
  }, [userId])

  if (!userId) {
    return <div>Waiting for user authentication...</div>
  }

  if (error) {
    console.error('Error in TopTracks:', error)
    return <div>Error loading tracks: {(error as Error).message}</div>
  }

  if (isLoading) {
    return <div>Loading your top tracks...</div>
  }

  // Ensure tracks is an array and has valid items
  const validTracks = Array.isArray(tracks) ? tracks.filter(track => 
    track && 
    typeof track === 'object' && 
    'id' in track
  ) : []

  if (validTracks.length === 0) {
    return <div>No tracks found. Try adding some songs!</div>
  }

  return (
    <div className="tracks-container">
      <h2>Your Top Tracks</h2>
      <div className="tracks-grid">
        {validTracks.map((track) => (
          <div key={track.id || 'unknown'} className="track-card">
            <div className="track-image">
              {track.image_url ? (
                <img 
                  src={track.image_url} 
                  alt={`${track.name || 'Unknown track'} album art`}
                  onError={(e) => {
                    console.log('Image load error, using fallback')
                    e.currentTarget.src = '/default-album-art.png'
                  }}
                />
              ) : (
                <div className="placeholder-image">
                  No Image Available
                </div>
              )}
            </div>
            <div className="track-info">
              <h3>{track.name || 'Unknown Track'}</h3>
              <p>{track.artist || 'Unknown Artist'}</p>
              <p className="album-name">{track.album || 'Unknown Album'}</p>
              <span className="rank">#{track.rank || '?'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TopTracks 