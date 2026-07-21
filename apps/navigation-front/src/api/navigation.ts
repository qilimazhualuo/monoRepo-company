export type LonLatPoint = {
    longitude: number
    latitude: number
}

export type RoadStatus = {
    table: string
    geomColumn: string
    count: number
    extent: {
        minLon: number
        minLat: number
        maxLon: number
        maxLat: number
    } | null
    ready: boolean
}

export type RouteResult = {
    coordinates: Array<[number, number]>
    distanceM: number
    durationSec: number
    snappedStart: [number, number]
    snappedEnd: [number, number]
    bufferDeg: number
}

type ApiResponse<T> = {
    code: string
    data: T
}

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
        ...init,
    })
    const payload = await response.json() as ApiResponse<T>
    if (payload.code !== '200') {
        throw new Error(typeof payload.data === 'string' ? payload.data : '请求失败')
    }
    return payload.data
}

export const fetchRoadStatus = () => {
    return requestJson<RoadStatus>('/nav-api/road-status')
}

export const fetchRoute = (start: LonLatPoint, end: LonLatPoint) => {
    return requestJson<RouteResult>('/nav-api/route', {
        method: 'POST',
        body: JSON.stringify({ start, end }),
    })
}
