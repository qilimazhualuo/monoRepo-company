export interface ApiResponse<T = unknown> {
    code: string
    data: T
    message?: string
}

export interface HttpClientOptions {
    baseUrl?: string
}

export const createHttpClient = (options: HttpClientOptions = {}) => {
    const baseUrl = options.baseUrl ?? '/api'

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

        if (result.code !== '200') {
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
        delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    }
}
