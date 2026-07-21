import { env } from '../config/env'
import { getSql } from '../db'

export type LonLat = [number, number]

export interface RoutePointInput {
    longitude: number
    latitude: number
}

export interface RouteResult {
    coordinates: LonLat[]
    distanceM: number
    durationSec: number
    snappedStart: LonLat
    snappedEnd: LonLat
    bufferDeg: number
}

type GeoJsonLine = {
    type: 'LineString'
    coordinates: LonLat[]
}

type RoadRow = {
    id: number | string
    geojson: GeoJsonLine
    length_m: number
}

type GraphEdge = {
    to: string
    cost: number
    coords: LonLat[]
}

const EARTH_RADIUS_M = 6371000
const AVG_SPEED_MPS = 40 / 3.6
const NODE_PRECISION = 6

const snapCoord = (longitude: number, latitude: number): LonLat => {
    return [
        Number(longitude.toFixed(NODE_PRECISION)),
        Number(latitude.toFixed(NODE_PRECISION)),
    ]
}

const toNodeKey = (longitude: number, latitude: number) => {
    const [snapLon, snapLat] = snapCoord(longitude, latitude)
    return `${snapLon},${snapLat}`
}

const haversineM = (from: LonLat, to: LonLat) => {
    const toRad = (degree: number) => (degree * Math.PI) / 180
    const latitudeDelta = toRad(to[1] - from[1])
    const longitudeDelta = toRad(to[0] - from[0])
    const fromLat = toRad(from[1])
    const toLat = toRad(to[1])
    const arc =
        Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(longitudeDelta / 2) ** 2
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(arc)))
}

const lineLengthM = (coords: LonLat[]) => {
    let total = 0
    for (let index = 1; index < coords.length; index += 1) {
        total += haversineM(coords[index - 1], coords[index])
    }
    return total
}

const distancePointToSegmentM = (point: LonLat, start: LonLat, end: LonLat) => {
    const [pointLon, pointLat] = point
    const [startLon, startLat] = start
    const [endLon, endLat] = end

    const deltaLon = endLon - startLon
    const deltaLat = endLat - startLat
    if (deltaLon === 0 && deltaLat === 0) {
        return {
            distanceM: haversineM(point, start),
            fraction: 0,
            snapped: start as LonLat,
        }
    }

    const fractionRaw =
        ((pointLon - startLon) * deltaLon + (pointLat - startLat) * deltaLat)
        / (deltaLon * deltaLon + deltaLat * deltaLat)
    const fraction = Math.max(0, Math.min(1, fractionRaw))
    const snapped: LonLat = [
        startLon + deltaLon * fraction,
        startLat + deltaLat * fraction,
    ]
    return {
        distanceM: haversineM(point, snapped),
        fraction,
        snapped,
    }
}

const projectPointOntoLine = (point: LonLat, lineCoords: LonLat[]) => {
    let bestDistance = Infinity
    let bestSnapped: LonLat = lineCoords[0]
    let bestSegmentIndex = 0
    let bestFraction = 0

    for (let index = 0; index < lineCoords.length - 1; index += 1) {
        const result = distancePointToSegmentM(point, lineCoords[index], lineCoords[index + 1])
        if (result.distanceM < bestDistance) {
            bestDistance = result.distanceM
            bestSnapped = result.snapped
            bestSegmentIndex = index
            bestFraction = result.fraction
        }
    }

    return {
        distanceM: bestDistance,
        snapped: bestSnapped,
        segmentIndex: bestSegmentIndex,
        fraction: bestFraction,
    }
}

const splitLineAtPoint = (lineCoords: LonLat[], segmentIndex: number, snapped: LonLat) => {
    const before: LonLat[] = lineCoords.slice(0, segmentIndex + 1)
    const after: LonLat[] = lineCoords.slice(segmentIndex + 1)
    const lastBefore = before[before.length - 1]
    if (lastBefore[0] !== snapped[0] || lastBefore[1] !== snapped[1]) {
        before.push(snapped)
    }
    const firstAfter = after[0]
    const afterWithSnap: LonLat[] =
        firstAfter && firstAfter[0] === snapped[0] && firstAfter[1] === snapped[1]
            ? after
            : [snapped, ...after]
    return { before, after: afterWithSnap }
}

const addDirectedEdge = (
    adjacency: Map<string, GraphEdge[]>,
    fromKey: string,
    toKey: string,
    coords: LonLat[],
) => {
    if (coords.length < 2) {
        return
    }
    const cost = lineLengthM(coords)
    if (cost <= 0) {
        return
    }
    const edges = adjacency.get(fromKey) ?? []
    edges.push({ to: toKey, cost, coords })
    adjacency.set(fromKey, edges)
}

const addBidirectionalEdge = (
    adjacency: Map<string, GraphEdge[]>,
    coords: LonLat[],
) => {
    if (coords.length < 2) {
        return
    }
    const startKey = toNodeKey(coords[0][0], coords[0][1])
    const endKey = toNodeKey(coords[coords.length - 1][0], coords[coords.length - 1][1])
    addDirectedEdge(adjacency, startKey, endKey, coords)
    addDirectedEdge(adjacency, endKey, startKey, [...coords].reverse())
}

const quoteIdent = (identifier: string) => `"${identifier.replace(/"/g, '""')}"`

const fetchRoadsInBuffer = async (
    start: RoutePointInput,
    end: RoutePointInput,
    bufferDeg: number,
): Promise<RoadRow[]> => {
    const sql = getSql()
    const tableName = quoteIdent(env.roadTable)
    const geomColumn = quoteIdent(env.roadGeomColumn)
    const idColumn = quoteIdent(env.roadIdColumn)

    const minLon = Math.min(start.longitude, end.longitude) - bufferDeg
    const minLat = Math.min(start.latitude, end.latitude) - bufferDeg
    const maxLon = Math.max(start.longitude, end.longitude) + bufferDeg
    const maxLat = Math.max(start.latitude, end.latitude) + bufferDeg

    const rows = await sql.unsafe(`
        SELECT
            dumped.id AS id,
            ST_AsGeoJSON(dumped.geom)::json AS geojson,
            ST_Length(dumped.geom::geography) AS length_m
        FROM (
            SELECT
                ${idColumn} AS id,
                (ST_Dump(${geomColumn})).geom AS geom
            FROM ${tableName}
            WHERE ${geomColumn} && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        ) AS dumped
        WHERE GeometryType(dumped.geom) IN ('LINESTRING', 'LineString')
    `, [minLon, minLat, maxLon, maxLat])

    return rows as RoadRow[]
}

const buildGraph = (roads: RoadRow[]) => {
    const adjacency = new Map<string, GraphEdge[]>()
    const lineSegments: LonLat[][] = []

    roads.forEach((road) => {
        const coords = road.geojson?.coordinates
        if (!Array.isArray(coords) || coords.length < 2) {
            return
        }
        const normalized = coords.map((pair) => snapCoord(Number(pair[0]), Number(pair[1])))
        lineSegments.push(normalized)
        addBidirectionalEdge(adjacency, normalized)
    })

    return { adjacency, lineSegments }
}

const attachEndpoint = (
    adjacency: Map<string, GraphEdge[]>,
    lineSegments: LonLat[][],
    point: RoutePointInput,
) => {
    const rawPoint: LonLat = [point.longitude, point.latitude]
    let bestDistance = Infinity
    let bestSnap: LonLat | null = null
    let bestLine: LonLat[] | null = null
    let bestSegmentIndex = 0

    lineSegments.forEach((lineCoords) => {
        const projected = projectPointOntoLine(rawPoint, lineCoords)
        if (projected.distanceM < bestDistance) {
            bestDistance = projected.distanceM
            bestSnap = projected.snapped
            bestLine = lineCoords
            bestSegmentIndex = projected.segmentIndex
        }
    })

    if (!bestSnap || !bestLine || bestDistance > env.snapToleranceM) {
        return null
    }

    const snapped = snapCoord(bestSnap[0], bestSnap[1])
    const { before, after } = splitLineAtPoint(bestLine, bestSegmentIndex, snapped)
    addBidirectionalEdge(adjacency, before)
    addBidirectionalEdge(adjacency, after)

    return {
        nodeKey: toNodeKey(snapped[0], snapped[1]),
        snapped,
        distanceM: bestDistance,
    }
}

const dijkstra = (
    adjacency: Map<string, GraphEdge[]>,
    startKey: string,
    endKey: string,
) => {
    const distanceMap = new Map<string, number>()
    const previousMap = new Map<string, { from: string; edge: GraphEdge }>()
    const visited = new Set<string>()
    const queue: Array<{ nodeKey: string; cost: number }> = [{ nodeKey: startKey, cost: 0 }]
    distanceMap.set(startKey, 0)

    while (queue.length) {
        queue.sort((left, right) => left.cost - right.cost)
        const current = queue.shift()
        if (!current) {
            break
        }
        if (visited.has(current.nodeKey)) {
            continue
        }
        visited.add(current.nodeKey)
        if (current.nodeKey === endKey) {
            break
        }

        const neighbors = adjacency.get(current.nodeKey) ?? []
        neighbors.forEach((edge) => {
            const nextCost = current.cost + edge.cost
            const known = distanceMap.get(edge.to)
            if (known !== undefined && known <= nextCost) {
                return
            }
            distanceMap.set(edge.to, nextCost)
            previousMap.set(edge.to, { from: current.nodeKey, edge })
            queue.push({ nodeKey: edge.to, cost: nextCost })
        })
    }

    if (!distanceMap.has(endKey)) {
        return null
    }

    const pathCoords: LonLat[] = []
    let cursor = endKey
    const chain: GraphEdge[] = []
    while (cursor !== startKey) {
        const previous = previousMap.get(cursor)
        if (!previous) {
            return null
        }
        chain.push(previous.edge)
        cursor = previous.from
    }
    chain.reverse()

    chain.forEach((edge, index) => {
        const coords = edge.coords
        if (index === 0) {
            pathCoords.push(...coords)
            return
        }
        pathCoords.push(...coords.slice(1))
    })

    return {
        coordinates: pathCoords,
        distanceM: distanceMap.get(endKey) ?? 0,
    }
}

const tryRouteWithBuffer = async (
    start: RoutePointInput,
    end: RoutePointInput,
    bufferDeg: number,
): Promise<RouteResult | null> => {
    const roads = await fetchRoadsInBuffer(start, end, bufferDeg)
    if (!roads.length) {
        return null
    }

    const { adjacency, lineSegments } = buildGraph(roads)
    const startAttach = attachEndpoint(adjacency, lineSegments, start)
    const endAttach = attachEndpoint(adjacency, lineSegments, end)
    if (!startAttach || !endAttach) {
        return null
    }

    const path = dijkstra(adjacency, startAttach.nodeKey, endAttach.nodeKey)
    if (!path || path.coordinates.length < 2) {
        return null
    }

    const coordinates = path.coordinates.filter((coord, index, list) => {
        if (index === 0) {
            return true
        }
        const previous = list[index - 1]
        return previous[0] !== coord[0] || previous[1] !== coord[1]
    })

    if (coordinates[0][0] !== startAttach.snapped[0] || coordinates[0][1] !== startAttach.snapped[1]) {
        coordinates.unshift(startAttach.snapped)
    }
    const last = coordinates[coordinates.length - 1]
    if (last[0] !== endAttach.snapped[0] || last[1] !== endAttach.snapped[1]) {
        coordinates.push(endAttach.snapped)
    }

    const distanceM = lineLengthM(coordinates)
    return {
        coordinates,
        distanceM,
        durationSec: Math.round(distanceM / AVG_SPEED_MPS),
        snappedStart: startAttach.snapped,
        snappedEnd: endAttach.snapped,
        bufferDeg,
    }
}

export const computeRoute = async (
    start: RoutePointInput,
    end: RoutePointInput,
): Promise<RouteResult> => {
    const status = await getRoadNetworkStatus()
    if (!status.ready) {
        throw new Error('路网表为空，请先把 gpkg 导入 PostgreSQL（见 sql/02_import_gpkg.md）')
    }

    let bufferDeg = env.routeBufferDeg
    let lastError = '附近没有可用路网'

    while (bufferDeg <= env.routeMaxBufferDeg + 1e-9) {
        const result = await tryRouteWithBuffer(start, end, bufferDeg)
        if (result) {
            return result
        }
        lastError = `缓冲区 ${bufferDeg.toFixed(2)}° 内未找到连通路径`
        bufferDeg += env.routeBufferStepDeg
    }

    throw new Error(lastError)
}

export const getRoadNetworkStatus = async () => {
    const sql = getSql()
    const tableName = quoteIdent(env.roadTable)
    const geomColumn = quoteIdent(env.roadGeomColumn)

    const countRows = await sql.unsafe(`SELECT COUNT(*)::int AS count FROM ${tableName}`)
    const extentRows = await sql.unsafe(`
        SELECT
            ST_XMin(extent) AS min_lon,
            ST_YMin(extent) AS min_lat,
            ST_XMax(extent) AS max_lon,
            ST_YMax(extent) AS max_lat
        FROM (
            SELECT ST_Extent(${geomColumn}) AS extent FROM ${tableName}
        ) AS boxed
        WHERE extent IS NOT NULL
    `)

    const count = Number(countRows[0]?.count ?? 0)
    const extent = extentRows[0]
        ? {
            minLon: Number(extentRows[0].min_lon),
            minLat: Number(extentRows[0].min_lat),
            maxLon: Number(extentRows[0].max_lon),
            maxLat: Number(extentRows[0].max_lat),
        }
        : null

    return {
        table: env.roadTable,
        geomColumn: env.roadGeomColumn,
        count,
        extent,
        ready: count > 0,
    }
}
