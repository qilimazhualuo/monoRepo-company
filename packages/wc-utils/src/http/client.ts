export interface ApiResponse<T = unknown> {
    code: string
    data: T
    message?: string
}

export interface HttpClientOptions {
    baseUrl?: string
    successCode?: string
    noErrCode?: boolean
}

export const createHttpClient = (options: HttpClientOptions = {}) => {
    const baseUrl = options.baseUrl ?? '/api'
    const successCode = options.successCode ?? '200'
    const noErrCode = options.noErrCode ?? false

    const request = async <T>(
        path: string,
        init: RequestInit = {},
    ): Promise<ApiResponse<T>> => {
        const response = await fetch(`${baseUrl}${path}`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(init.headers ?? {}),
            },
            ...init,
        })

        const result = (await response.json()) as ApiResponse<T> & {
            message?: string
            summary?: string
        }

        if (!response.ok) {
            throw {
                code: result.code ?? String(response.status),
                data: result.data ?? result.summary ?? result.message ?? '请求失败',
            }
        }

        if (!noErrCode && result.code !== successCode) {
            throw result
        }

        return result
    }

    return {
        get: <T>(path: string) => request<T>(path),
        post: <T>(path: string, body?: unknown) =>
            request<T>(path, {
                method: 'POST',
                body: body !== undefined ? JSON.stringify(body) : undefined,
            }),
        put: <T>(path: string, body?: unknown) =>
            request<T>(path, {
                method: 'PUT',
                body: body !== undefined ? JSON.stringify(body) : undefined,
            }),
        delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    }
}
