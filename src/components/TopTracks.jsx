import { useEffect, useState } from 'react'
import { getUserTracks } from '../lib/supabase'

export default function TopTracks({ userId }) {
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) return

    async function fetchTracks() {
      try {
        setLoading(true)
        const data = await getUserTracks(userId)
        console.log('Fetched tracks:', data) // Debug log
        setTracks(data || [])
      } catch (err) {
        console.error('Error fetching tracks:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTracks()
  }, [userId])

  if (loading) {
    return <div className="p-4">Loading your top tracks...</div>
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>
  }

  if (!tracks.length) {
    return <div className="p-4">No tracks found. Try adding some songs!</div>
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Your Top 5 Tracks</h2>
      <div className="space-y-4">
        {tracks.map((track, index) => (
          <div 
            key={track?.id || index}
            className="bg-white rounded-lg shadow-md p-4 flex items-center space-x-4"
          >
            {track?.image_url && (
              <img 
                src={track.image_url} 
                alt={track?.name || 'Track'} 
                className="w-16 h-16 object-cover rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <span className="text-lg font-bold mr-2">#{track?.rank || (index + 1)}</span>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {track?.name || 'Unknown Track'}
                </p>
              </div>
              <p className="text-sm text-gray-500 truncate">
                {track?.artist || 'Unknown Artist'}
              </p>
              <p className="text-sm text-gray-400 truncate">
                {track?.album || 'Unknown Album'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 