import { supabase } from './lib/supabase.js'

const cronSecret = process.env.CRON_SECRET

// Cron so we have to use GET
export async function GET(req: Request) {
  // Verify the secret token from Vercel
  const authorization = req.headers.get('authorization')
  if (authorization !== `Bearer ${cronSecret}`) {
    console.log('Auth failed. Expected:', cronSecret, 'Got:', authorization)
    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    // Get all tracks
    const { data: tracks, error } = await supabase
      .from('tracks')
      .select('*')

    if (error) {
      console.error('Error fetching tracks:', error)
      return new Response(JSON.stringify({ message: 'Error fetching tracks', error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!tracks || tracks.length === 0) {
      console.log('No tracks found in database')
      return new Response(JSON.stringify({ message: 'No tracks found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Pick a random track
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)]

    // Reset all tracks to not be track of day
    const { error: resetError } = await supabase
      .from('tracks')
      .update({ is_track_of_day: false })
      .filter('id', 'not.is', null)

    if (resetError) {
      console.error('Error resetting tracks:', resetError)
      return new Response(JSON.stringify({ message: 'Error resetting tracks', error: resetError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Set the selected track as track of the day
    const { error: updateError } = await supabase
      .from('tracks')
      .update({ is_track_of_day: true })
      .eq('id', randomTrack.id)

    if (updateError) {
      console.error('Error setting track of the day:', updateError)
      return new Response(JSON.stringify({ message: 'Error setting track of the day', error: updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ message: 'Track of the day updated successfully', track: randomTrack }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error updating track of the day:', error)
    return new Response(JSON.stringify({ message: 'Error updating track of the day', error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

