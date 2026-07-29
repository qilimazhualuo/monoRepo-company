import multer from 'multer'
import { getRoadStatus, findRoute } from '../services/routing.js'
import { importGpkgStream } from '../services/gpkgImport.js'

const upload = multer({ storage: multer.memoryStorage() })

export const roadStatusHandler = async (req, res) => {
    const result = await getRoadStatus()
    res.json({ code: '200', data: result })
}

export const routeHandler = async (req, res) => {
    const { start_lon, start_lat, end_lon, end_lat } = req.query
    if (!start_lon || !start_lat || !end_lon || !end_lat) {
        res.json({ code: '500', data: '缺少 start_lon/start_lat/end_lon/end_lat 参数' })
        return
    }

    const result = await findRoute(
        parseFloat(start_lon),
        parseFloat(start_lat),
        parseFloat(end_lon),
        parseFloat(end_lat),
    )

    if (result.found) {
        res.json({ code: '200', data: result })
    } else {
        res.json({ code: '500', data: result.msg })
    }
}

export const importGpkgHandler = [
    upload.single('file'),
    async (req, res) => {
        if (!req.file) {
            res.json({ code: '500', data: '请上传文件' })
            return
        }

        if (!req.file.originalname.toLowerCase().endsWith('.gpkg')) {
            res.json({ code: '500', data: '请上传 .gpkg 文件' })
            return
        }

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()

        await importGpkgStream(req.file.buffer, req.file.originalname, res)
    },
]
