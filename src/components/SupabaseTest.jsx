import { useEffect, useState } from 'react'
import { supabase, cleanupAllTables } from '../lib/supabase'

function SupabaseTest({ userId }) {
  const [status, setStatus] = useState('Waiting for authentication...')
  const [error, setError] = useState(null)
  const [results, setResults] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setStatus('Please login first to test the connection')
      return
    }

    async function testConnection() {
      try {
        setStatus('Testing connections...')
        const tests = []

        // Test 1: Users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        tests.push({
          name: 'Users table',
          success: !userError,
          error: userError?.message,
          data: userData
        })

        // Test 2: Tracks table - First check if we can read
        const { data: tracksData, error: tracksReadError } = await supabase
          .from('tracks')
          .select('spotify_id, name, artist, album')
          .limit(1)

        tests.push({
          name: 'Tracks table (Read)',
          success: !tracksReadError,
          error: tracksReadError?.message,
          data: tracksData
        })

        // Test 3: Try to insert a test track
        const testTrack = {
          name: 'Test Track',
          artist: 'Test Artist',
          album: 'Test Album',
          image_url: 'https://example.com/image.jpg',
          spotify_id: `test_${Date.now()}`
        }

        console.log('Attempting to insert track:', testTrack)
        
        // First check if track exists (following saveTrack pattern)
        const { data: existingTrack, error: fetchError } = await supabase
          .from('tracks')
          .select('id, spotify_id, name, artist, album, image_url')
          .eq('spotify_id', testTrack.spotify_id)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError
        }

        let insertedTrack
        let insertError

        if (!existingTrack) {
          const result = await supabase
            .from('tracks')
            .insert(testTrack)
            .select('id, spotify_id, name, artist, album, image_url')
            .single()
          
          insertedTrack = result.data
          insertError = result.error
        } else {
          insertedTrack = existingTrack
        }

        console.log('Insert result:', { data: insertedTrack, error: insertError })
        
        tests.push({
          name: 'Tracks table (Insert)',
          success: !insertError && insertedTrack?.id,
          error: insertError?.message || (!insertedTrack?.id ? 'No track ID returned' : null),
          data: insertedTrack
        })

        if (!insertError && insertedTrack?.id) {
          // Test 4: User_tracks table - Link the test track to user
          const userTrack = {
            user_id: userId,
            track_id: insertedTrack.id,
            rank: 1 // Add rank for testing
          }

          const { data: userTrackData, error: userTrackError } = await supabase
            .from('user_tracks')
            .upsert(userTrack)
            .select('user_id, track_id, rank')
            .single()

          tests.push({
            name: 'User_tracks table (Insert)',
            success: !userTrackError && userTrackData?.track_id,
            error: userTrackError?.message || (!userTrackData?.track_id ? 'No track_id in response' : null),
            data: userTrackData
          })

          // Add verification test
          console.log('Verifying user tracks for userId:', userId)
          const { data: verifyData, error: verifyError } = await supabase
            .from('user_tracks')
            .select(`
              track_id,
              rank,
              tracks (
                id,
                name,
                artist,
                album,
                image_url,
                spotify_id
              )
            `)
            .eq('user_id', userId)
            .order('rank', { ascending: true })

          console.log('Verification result:', { 
            data: verifyData?.map(d => ({
              rank: d.rank,
              track: d.tracks
            })), 
            error: verifyError 
          })

          tests.push({
            name: 'Verify User Tracks',
            success: !verifyError && Array.isArray(verifyData) && verifyData.length > 0,
            error: verifyError?.message || (!verifyData?.length ? 'No tracks found' : null),
            data: verifyData?.map(d => ({
              rank: d.rank,
              track: d.tracks
            }))
          })

          // Let's also check the direct track data
          const { data: directTrackData, error: directTrackError } = await supabase
            .from('tracks')
            .select('id, spotify_id, name, artist, album, image_url')
            .eq('id', insertedTrack.id)
            .single()

          tests.push({
            name: 'Direct Track Check',
            success: !directTrackError && directTrackData?.id,
            error: directTrackError?.message || (!directTrackData?.id ? 'Track not found' : null),
            data: directTrackData
          })

          // Check user_tracks table directly
          const { data: directUserTrackData, error: directUserTrackError } = await supabase
            .from('user_tracks')
            .select('user_id, track_id, rank')
            .eq('user_id', userId)
            .order('rank', { ascending: true })

          tests.push({
            name: 'Direct User_tracks Check',
            success: !directUserTrackError && Array.isArray(directUserTrackData) && directUserTrackData.length > 0,
            error: directUserTrackError?.message || (!directUserTrackData?.length ? 'No user tracks found' : null),
            data: directUserTrackData
          })

          // Clean up: Delete the test data
          if (!userTrackError) {
            await supabase
              .from('user_tracks')
              .delete()
              .eq('track_id', insertedTrack.id)
              .eq('user_id', userId)
          }

          if (!existingTrack) {
            await supabase
              .from('tracks')
              .delete()
              .eq('id', insertedTrack.id)
          }
        }

        // Update results
        setResults(tests)

        // Check overall status
        const allSuccess = tests.every(test => test.success)
        if (allSuccess) {
          setStatus('✅ All connection tests passed!')
        } else {
          setStatus('❌ Some tests failed')
          setError(tests.find(test => !test.success)?.error)
        }

      } catch (err) {
        console.error('Supabase test error:', err)
        setError(err.message)
        setStatus('❌ Connection test failed')
      }
    }

    testConnection()
  }, [userId])

  const handleCleanup = async () => {
    if (!confirm('Are you sure you want to delete all data from the database?')) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await cleanupAllTables()
      setStatus('Database cleaned successfully')
      setResults([])
    } catch (err) {
      setError(err.message)
      setStatus('Cleanup failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Supabase Connection Test</h2>
      <div style={{ 
        padding: '15px',
        borderRadius: '8px',
        backgroundColor: error ? '#fee' : '#efe',
        marginTop: '10px'
      }}>
        <p><strong>Status:</strong> {status}</p>
        {error && (
          <p style={{ color: 'red', marginTop: '10px' }}>
            <strong>Error:</strong> {error}
          </p>
        )}
        {Array.isArray(results) && results.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <strong>Test Results:</strong>
            {results.map((test, index) => (
              <div key={index} style={{ 
                marginTop: '10px',
                padding: '10px',
                backgroundColor: test.success ? '#efffef' : '#fff0f0',
                borderRadius: '4px'
              }}>
                <p><strong>{test.name}:</strong> {test.success ? '✅ Passed' : '❌ Failed'}</p>
                {test.error && <p style={{ color: 'red' }}>Error: {test.error}</p>}
                {test.data && (
                  <details>
                    <summary>Data Structure</summary>
                    <pre style={{ fontSize: '12px' }}>
                      {JSON.stringify(test.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={handleCleanup}
            disabled={isLoading}
            style={{
              backgroundColor: '#ff4444',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Cleaning...' : 'Clean Database'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SupabaseTest 