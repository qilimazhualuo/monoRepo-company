export type TifFileInfo = {
    id: string
    filename: string
    size: number
    width: number | null
    height: number | null
    west: number | null
    south: number | null
    east: number | null
    north: number | null
    crs: string | null
    createdAt: string
}

type ApiResponse<T> = {
    code: string
    data: T
}

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(url, init)
    const payload = await response.json() as ApiResponse<T>
    if (!response.ok || payload.code !== '200') {
        throw new Error(typeof payload.data === 'string' ? payload.data : '请求失败')
    }
    return payload.data
}

export const fetchHealth = () => requestJson<{ status: string }>('/tif-api/health')

export const listTifFiles = () => requestJson<TifFileInfo[]>('/tif-api/files')

export const uploadTifFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return requestJson<TifFileInfo>('/tif-api/files/upload', {
        method: 'POST',
        body: formData,
    })
}

export const fetchTifMeta = (fileId: string) =>
    requestJson<TifFileInfo>(`/tif-api/files/${fileId}`)

export const fetchHeightmapMeta = (fileId: string) =>
    requestJson<{
        width: number
        height: number
        west: number
        south: number
        east: number
        north: number
        minHeight: number
        maxHeight: number
        nodata: number
        tileSize: number
    }>(`/tif-api/files/${fileId}/heightmap`)

export const fetchHeightmapBin = async (fileId: string) => {
    const response = await fetch(`/tif-api/files/${fileId}/heightmap.bin`)
    if (!response.ok) {
        throw new Error('下载 heightmap 失败')
    }
    return response.arrayBuffer()
}
