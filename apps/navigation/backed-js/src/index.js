import express from 'express'
import cors from 'cors'
import { roadStatusHandler, routeHandler, importGpkgHandler } from './routes/navigation.js'

const PORT = 9004

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/road-status', roadStatusHandler)
app.get('/api/route', routeHandler)
app.post('/api/import-gpkg', importGpkgHandler)

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[navigation-js] 已启动: http://localhost:${PORT}`)
})
