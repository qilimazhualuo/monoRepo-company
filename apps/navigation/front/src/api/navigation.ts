export type LonLatPoint = {
    longitude: number
    latitude: number
}

export type RoadStatus = {
    ready: boolean
    count: number
    msg: string
}

export type RouteResult = {
    found: boolean
    coords: Array<[number, number]>
    distance_km: number
    duration_min: number
    buffer_used_deg: number
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
    const params = new URLSearchParams({
        start_lon: String(start.longitude),
        start_lat: String(start.latitude),
        end_lon: String(end.longitude),
        end_lat: String(end.latitude),
    })
    return requestJson<RouteResult>(`/nav-api/route?${params}`)
}

export type GpkgImportProgress = {
    percent: number
    msg: string
}

export type GpkgImportDone = {
    total: number
}

/**
 * 上传 gpkg 并通过 SSE 接收进度
 * onProgress: 收到进度事件
 * onDone: 导入完成
 * onError: 导入出错
 */
export const importGpkg = (
    file: File,
    callbacks: {
        onProgress?: (data: GpkgImportProgress) => void
        onDone?: (data: GpkgImportDone) => void
        onError?: (msg: string) => void
    }
) => {
    const formData = new FormData()
    formData.append('file', file, file.name)

    const controller = new AbortController()

    fetch('/nav-api/import-gpkg', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
    }).then(async (response) => {
        if (!response.ok || !response.body) {
            callbacks.onError?.(`HTTP ${response.status}`)
            return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            const parts = buffer.split('\n\n')
            buffer = parts.pop() || ''

            for (const part of parts) {
                const lines = part.split('\n')
                let event = ''
                let data = ''
                for (const line of lines) {
                    if (line.startsWith('event: ')) event = line.slice(7)
                    if (line.startsWith('data: ')) data = line.slice(6)
                }
                if (!event || !data) continue

                try {
                    const parsed = JSON.parse(data)
                    if (event === 'progress') callbacks.onProgress?.(parsed)
                    else if (event === 'done') callbacks.onDone?.(parsed)
                    else if (event === 'error') callbacks.onError?.(parsed.msg)
                } catch { /* ignore parse errors */ }
            }
        }
    }).catch((err) => {
        if (err.name !== 'AbortError') {
            callbacks.onError?.(err.message || '网络错误')
        }
    })

    return { abort: () => controller.abort() }
}
