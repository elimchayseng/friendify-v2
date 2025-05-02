import express from 'express'
import cors from 'cors'
import updateTrackOfDayRouter from './routes/updateTrackOfDay.js'
import { config } from './config/config.js'
import { supabase } from './lib/supabase.js'

const app = express()

// Configure CORS
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default port
  credentials: true
}))

app.use(express.json())

// Track of the day update endpoint
app.use('/api/updateTrackOfDay', updateTrackOfDayRouter)

// Get track of the day endpoint
app.get('/api/getTrackOfDay', async (req, res) => {
  try {
    console.log('Fetching track of day...')
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('is_track_of_day', true)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    console.log('Track of day data:', data)
    res.json({ track: data })
  } catch (error) {
    console.error('Error fetching track of the day:', error)
    res.status(500).json({ 
      message: 'Error fetching track of day',
      error: error.message 
    })
  }
})

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
}) 