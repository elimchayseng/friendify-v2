import { supabase } from '../lib/supabase'

export async function updateTrackOfDay() {
  try {
    // Reset all tracks' is_track_of_day to false
    await supabase
      .from('tracks')
      .update({ is_track_of_day: false })
      .neq('id', '') // Update all tracks

    // Get all track IDs from user_tracks
    const { data: userTracks, error: userTracksError } = await supabase
      .from('user_tracks')
      .select('track_id')
    
    if (userTracksError) throw userTracksError

    // Get a random track ID from the list
    const trackIds = userTracks.map(ut => ut.track_id)
    const randomIndex = Math.floor(Math.random() * trackIds.length)
    const selectedTrackId = trackIds[randomIndex]

    // Update the selected track to be track of the day
    const { error: updateError } = await supabase
      .from('tracks')
      .update({ is_track_of_day: true })
      .eq('id', selectedTrackId)

    if (updateError) throw updateError

    return { success: true }
  } catch (error) {
    console.error('Error updating track of the day:', error)
    return { success: false, error }
  }
} 