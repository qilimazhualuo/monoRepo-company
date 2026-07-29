import { GeoPackageAPI } from '@ngageoint/geopackage'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { query } from '../db.js'

const ROAD_TABLE = 'roads'

/**
 * 导入 gpkg 到 PostGIS，通过 SSE 推送进度
 */
export const importGpkgStream = async (fileBuffer, filename, res) => {
    const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    sendEvent('progress', { percent: 0, msg: '开始解析 gpkg 文件' })

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpkg-'))
    const tmpPath = path.join(tmpDir, filename || 'upload.gpkg')
    let geoPackage = null

    try {
        fs.writeFileSync(tmpPath, fileBuffer)

        geoPackage = await GeoPackageAPI.open(tmpPath)
        const featureTables = geoPackage.getFeatureTables()

        if (featureTables.length === 0) {
            sendEvent('error', { msg: 'gpkg 中未找到要素图层' })
            res.end()
            return
        }

        sendEvent('progress', { percent: 2, msg: `发现图层: ${featureTables.join(', ')}` })

        // 优先选包含 road 的图层
        let targetTable = featureTables[0]
        for (const tableName of featureTables) {
            if (tableName.toLowerCase().includes('road')) {
                targetTable = tableName
                break
            }
        }

        const featureDao = geoPackage.getFeatureDao(targetTable)
        const totalCount = featureDao.count()

        if (totalCount === 0) {
            sendEvent('error', { msg: 'gpkg 文件中没有记录' })
            res.end()
            return
        }

        sendEvent('progress', { percent: 5, msg: `图层 ${targetTable}, 共 ${totalCount} 条记录` })

        // 获取列信息
        const columnNames = featureDao.columns
        const geomColName = featureDao.getGeometryColumnName()

        const findCol = (candidates) => {
            for (const candidate of candidates) {
                if (columnNames.includes(candidate)) return candidate
            }
            return null
        }

        const idCol = findCol(['osm_id', 'fid', 'ogc_fid', 'id'])
        const nameCol = findCol(['name', 'road_name', 'NAME'])
        const fclassCol = findCol(['fclass', 'highway', 'road_type', 'type'])

        // 重建 roads 表
        await query(`DROP TABLE IF EXISTS "${ROAD_TABLE}" CASCADE`)
        await query(`
            CREATE TABLE "${ROAD_TABLE}" (
                gid SERIAL PRIMARY KEY,
                road_id TEXT,
                name TEXT,
                fclass TEXT,
                geom geometry(Geometry, 4326)
            )
        `)

        sendEvent('progress', { percent: 10, msg: 'roads 表已创建，开始写入' })

        // 通过底层 sqlite 连接查询所有行，用 GeoJSON 转换几何
        const batchSize = 2000
        let inserted = 0
        let valuesList = []
        let paramIdx = 1
        let params = []

        // 使用 geoPackage 的底层连接直接查询
        const dbConn = geoPackage.database
        const allRows = dbConn.all(`SELECT * FROM "${targetTable}"`)

        for (const row of allRows) {
            // 从 FeatureDao 获取 FeatureRow 来解析几何
            const featureRow = featureDao.getRow(row)
            const geometryData = featureRow.geometry

            if (!geometryData || !geometryData.geometry) {
                continue
            }

            const geojson = geometryData.geometry.toGeoJSON()
            const roadId = idCol ? String(row[idCol] ?? '') : String(inserted)
            const roadName = nameCol ? String(row[nameCol] ?? '') : ''
            const roadFclass = fclassCol ? String(row[fclassCol] ?? '') : ''

            valuesList.push(
                `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, ST_SetSRID(ST_GeomFromGeoJSON($${paramIdx + 3}), 4326))`
            )
            params.push(roadId, roadName, roadFclass, JSON.stringify(geojson))
            paramIdx += 4
            inserted++

            if (valuesList.length >= batchSize) {
                await query(
                    `INSERT INTO "${ROAD_TABLE}" (road_id, name, fclass, geom) VALUES ${valuesList.join(', ')}`,
                    params
                )
                const percent = Math.min(10 + Math.floor(85 * inserted / totalCount), 95)
                sendEvent('progress', { percent, msg: `已写入 ${inserted}/${totalCount}` })
                valuesList = []
                params = []
                paramIdx = 1
            }
        }

        // 写入剩余
        if (valuesList.length > 0) {
            await query(
                `INSERT INTO "${ROAD_TABLE}" (road_id, name, fclass, geom) VALUES ${valuesList.join(', ')}`,
                params
            )
        }

        // 创建空间索引
        await query(`CREATE INDEX IF NOT EXISTS idx_${ROAD_TABLE}_geom ON "${ROAD_TABLE}" USING GIST (geom)`)

        sendEvent('progress', { percent: 100, msg: `导入完成，共 ${inserted} 条路网记录` })
        sendEvent('done', { total: inserted })
        res.end()

    } catch (err) {
        console.error('[gpkg-import] 导入失败:', err)
        sendEvent('error', { msg: err.message || '导入失败' })
        res.end()
    } finally {
        if (geoPackage) {
            try { geoPackage.close() } catch (_) { /* ignore */ }
        }
        setTimeout(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }, 1000)
    }
}
