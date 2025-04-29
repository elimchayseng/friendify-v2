import { useEffect, useState } from 'react'
import { getAllUserTracks } from '../lib/supabase'

interface Track {
  id: string
  name: string
  artist: string
  album: string
  image_url: string
  spotify_id: string
  rank: number
}

interface User {
  id: string
  username: string
}

interface UserTracks {
  user: User
  tracks: Track[]
}

export default function AllUserTracks() {
  const [userTracks, setUserTracks] = useState<UserTracks[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAllUserTracks() {
      try {
        const data = await getAllUserTracks()
        console.log('Fetched user tracks:', data)
        setUserTracks(data)
      } catch (err) {
        console.error('Error fetching all user tracks:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch tracks')
      } finally {
        setLoading(false)
      }
    }

    fetchAllUserTracks()
    // Refresh every minute
    const interval = setInterval(fetchAllUserTracks, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="p-4">Loading tracks...</div>
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>
  }

  if (!userTracks.length) {
    return <div className="p-4">No tracks found. Try adding some songs!</div>
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Everyone's Top 5 Tracks</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userTracks.map((userTrack) => (
          <div 
            key={userTrack.user.id}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div className="p-4 bg-gray-50">
              <h3 className="text-xl font-semibold">{userTrack.user.username}'s Top Tracks</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {userTrack.tracks
                .sort((a, b) => a.rank - b.rank)
                .map((track) => (
                  <div key={track.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      {track.image_url && (
                        <img 
                          src={track.image_url} 
                          alt={track.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <span className="text-lg font-bold mr-2">#{track.rank}</span>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {track.name}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {track.artist}
                        </p>
                        <p className="text-sm text-gray-400 truncate">
                          {track.album}
                        </p>
                      </div>
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