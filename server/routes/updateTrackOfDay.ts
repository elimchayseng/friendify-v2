import { supabase } from '../lib/supabase.js'
import express, { Request, Response, Router, RequestHandler } from 'express'
import { config } from '../config/config.js'
import { PostgrestError } from '@supabase/supabase-js'

const router: Router = express.Router()

interface Track {
  id: string
  name?: string
  artist?: string
  album?: string
  spotify_id?: string
  image_url?: string | null
}

type ApiResponse<T> = {
  message: string
  track?: T
  error?: string
  details?: {
    code?: string
    hint?: string
  }
}

const updateTrackHandler: RequestHandler = async (req, res) => {
  // Verify the secret token from Vercel
  const authorization = req.headers.authorization
  if (authorization !== `Bearer ${config.cronSecret}`) {
    console.log('Auth failed. Expected:', config.cronSecret, 'Got:', authorization)
    return res.status(401).json({ message: 'Unauthorized' })
  }

  return (async () => {
    try {
      console.log('Supabase Configuration:', {
        url: config.supabaseUrl,
        hasKey: !!config.supabaseKey,
        keyPrefix: config.supabaseKey.slice(0, 5) + '...'
      })

      console.log('Fetching tracks from Supabase...')
      // Get a random track from all tracks
      const { data: tracks, error } = await supabase
        .from('tracks')
        .select('*')
      
      if (error) {
        console.error('Error fetching tracks:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      if (!tracks || tracks.length === 0) {
        console.log('No tracks found in database')
        return res.status(404).json({ message: 'No tracks found' })
      }

      console.log(`Found ${tracks.length} tracks`)
      const randomTrack = tracks[Math.floor(Math.random() * tracks.length)]
      console.log('Selected random track:', randomTrack)

      // Update the track of the day
      console.log('Updating track of the day...')
      
      // First, reset all tracks to not be track of day
      const { error: resetError } = await supabase
        .from('tracks')
        .update({ is_track_of_day: false })
        .filter('id', 'not.is', null) // Update all tracks with non-null IDs

      if (resetError) {
        console.error('Error resetting tracks:', resetError)
        throw resetError
      }

      // Then set the selected track as track of the day
      const { error: updateError } = await supabase
        .from('tracks')
        .update({ is_track_of_day: true })
        .eq('id', randomTrack.id)

      if (updateError) {
        console.error('Error setting track of the day:', updateError)
        throw updateError
      }

      return res.json({ message: 'Track of the day updated successfully', track: randomTrack })
    } catch (error) {
      console.error('Error updating track of the day:', {
        error,
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        details: error instanceof PostgrestError ? {
          code: error.code,
          details: error.details,
          hint: error.hint
        } : undefined
      })
      
      const errorMessage = error instanceof PostgrestError 
        ? `Database error: ${error.message} (Code: ${error.code})`
        : error instanceof Error 
          ? `Application error: ${error.message}`
          : `Unknown error: ${String(error)}`
      
      return res.status(500).json({ 
        message: 'Error updating track of the day',
        error: errorMessage,
        details: error instanceof PostgrestError ? {
          code: error.code,
          hint: error.hint
        } : undefined
      })
    }
  })()
}

router.get('/', updateTrackHandler)

export default router 