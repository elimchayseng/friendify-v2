import express from 'express'
import cors from 'cors'
import updateTrackOfDayRouter from './routes/updateTrackOfDay.js'
import { config } from './config/config.js'

const app = express()
app.use(cors())
app.use(express.json())

// Track of the day update endpoint
app.use('/api/updateTrackOfDay', updateTrackOfDayRouter)

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`)
}) 