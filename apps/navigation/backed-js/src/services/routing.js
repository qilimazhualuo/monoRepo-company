import { query } from '../db.js'

const ROAD_TABLE = 'roads'
const BUFFER_DEG = 0.15
const MAX_BUFFER_DEG = 0.8
const BUFFER_STEP_DEG = 0.15
const SNAP_TOLERANCE_KM = 0.5
const AVG_SPEED_KMH = 40

export const getRoadStatus = async () => {
    try {
        const tableCheck = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables WHERE table_name = '${ROAD_TABLE}'
            )
        `)
        const exists = tableCheck.rows[0].exists
        if (!exists) {
            return { ready: false, count: 0, msg: 'roads 表不存在' }
        }
        const countResult = await query(`SELECT COUNT(1) as cnt FROM "${ROAD_TABLE}"`)
        const count = parseInt(countResult.rows[0].cnt)
        return { ready: count > 0, count, msg: count > 0 ? 'ok' : '表为空' }
    } catch (err) {
        return { ready: false, count: 0, msg: err.message }
    }
}

export const findRoute = async (startLon, startLat, endLon, endLat) => {
    let bufferDeg = BUFFER_DEG

    while (bufferDeg <= MAX_BUFFER_DEG) {
        const roads = await fetchRoadsInBuffer(startLon, startLat, endLon, endLat, bufferDeg)
        if (roads.length > 0) {
            const { graph, nodeCoords } = buildGraph(roads)
            if (Object.keys(graph).length > 0) {
                const startNode = snapToNearestNode(startLon, startLat, nodeCoords)
                const endNode = snapToNearestNode(endLon, endLat, nodeCoords)
                if (startNode && endNode && startNode !== endNode) {
                    const pathNodes = dijkstra(graph, startNode, endNode)
                    if (pathNodes) {
                        const coords = pathNodes.map((nid) => nodeCoords[nid])
                        const distanceKm = calcPathDistance(coords)
                        return {
                            found: true,
                            coords,
                            distance_km: Math.round(distanceKm * 100) / 100,
                            duration_min: Math.round((distanceKm / AVG_SPEED_KMH) * 60 * 10) / 10,
                            buffer_used_deg: bufferDeg,
                        }
                    }
                }
            }
        }
        bufferDeg += BUFFER_STEP_DEG
    }

    return { found: false, msg: `缓冲区 ${MAX_BUFFER_DEG}° 内未找到连通路径` }
}

const fetchRoadsInBuffer = async (startLon, startLat, endLon, endLat, bufferDeg) => {
    const minLon = Math.min(startLon, endLon) - bufferDeg
    const maxLon = Math.max(startLon, endLon) + bufferDeg
    const minLat = Math.min(startLat, endLat) - bufferDeg
    const maxLat = Math.max(startLat, endLat) + bufferDeg

    try {
        const result = await query(
            `SELECT gid, road_id, fclass, ST_AsText(geom) AS geom_wkt
             FROM "${ROAD_TABLE}"
             WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)`,
            [minLon, minLat, maxLon, maxLat]
        )
        return result.rows
    } catch (err) {
        console.warn('[routing] 拉取路网失败:', err.message)
        return []
    }
}

const buildGraph = (roads) => {
    const graph = {}
    const nodeCoords = {}

    for (const road of roads) {
        const coords = parseLinestringWkt(road.geom_wkt)
        if (coords.length < 2) continue

        for (let idx = 0; idx < coords.length - 1; idx++) {
            const [lonA, latA] = coords[idx]
            const [lonB, latB] = coords[idx + 1]
            const nodeA = `${lonA.toFixed(6)},${latA.toFixed(6)}`
            const nodeB = `${lonB.toFixed(6)},${latB.toFixed(6)}`

            nodeCoords[nodeA] = [lonA, latA]
            nodeCoords[nodeB] = [lonB, latB]

            const dist = haversine(lonA, latA, lonB, latB)

            if (!graph[nodeA]) graph[nodeA] = []
            if (!graph[nodeB]) graph[nodeB] = []
            graph[nodeA].push([nodeB, dist])
            graph[nodeB].push([nodeA, dist])
        }
    }

    return { graph, nodeCoords }
}

const parseLinestringWkt = (wkt) => {
    if (!wkt) return []

    if (wkt.startsWith('MULTILINESTRING')) {
        const inner = wkt.replace('MULTILINESTRING', '').trim()
        const coords = []
        const segments = inner.slice(1, -1).split('),(')
        for (const seg of segments) {
            coords.push(...parseCoordString(seg.replace(/[()]/g, '')))
        }
        return coords
    }

    if (wkt.startsWith('LINESTRING')) {
        const inner = wkt.replace('LINESTRING', '').trim().replace(/[()]/g, '')
        return parseCoordString(inner)
    }

    return []
}

const parseCoordString = (str) => {
    const coords = []
    for (const pair of str.split(',')) {
        const parts = pair.trim().split(/\s+/)
        if (parts.length >= 2) {
            const lon = parseFloat(parts[0])
            const lat = parseFloat(parts[1])
            if (!isNaN(lon) && !isNaN(lat)) {
                coords.push([lon, lat])
            }
        }
    }
    return coords
}

const snapToNearestNode = (lon, lat, nodeCoords) => {
    let bestNode = null
    let bestDist = Infinity

    for (const [nid, [nlon, nlat]] of Object.entries(nodeCoords)) {
        const dist = haversine(lon, lat, nlon, nlat)
        if (dist < bestDist) {
            bestDist = dist
            bestNode = nid
        }
    }

    return bestNode
}

const dijkstra = (graph, start, end) => {
    const distMap = new Map([[start, 0]])
    const prevMap = new Map([[start, null]])
    const visited = new Set()

    // 简单优先队列（数组实现）
    const heap = [[0, start]]

    while (heap.length > 0) {
        heap.sort((a, b) => a[0] - b[0])
        const [currentDist, current] = heap.shift()

        if (visited.has(current)) continue
        visited.add(current)

        if (current === end) {
            const pathResult = []
            let node = end
            while (node !== null) {
                pathResult.push(node)
                node = prevMap.get(node) ?? null
            }
            return pathResult.reverse()
        }

        for (const [neighbor, weight] of (graph[current] || [])) {
            if (visited.has(neighbor)) continue
            const newDist = currentDist + weight
            if (newDist < (distMap.get(neighbor) ?? Infinity)) {
                distMap.set(neighbor, newDist)
                prevMap.set(neighbor, current)
                heap.push([newDist, neighbor])
            }
        }
    }

    return null
}

const haversine = (lon1, lat1, lon2, lat2) => {
    const R = 6371.0
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const lat1R = toRad(lat1)
    const lat2R = toRad(lat2)
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1R) * Math.cos(lat2R) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const toRad = (deg) => (deg * Math.PI) / 180

const calcPathDistance = (coords) => {
    let total = 0
    for (let idx = 0; idx < coords.length - 1; idx++) {
        total += haversine(coords[idx][0], coords[idx][1], coords[idx + 1][0], coords[idx + 1][1])
    }
    return total
}
