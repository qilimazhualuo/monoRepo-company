import type { AuthKitConfig } from './types'

export const parseCookies = (cookieHeader?: string | null) => {
    if (!cookieHeader) {
        return {} as Record<string, string>
    }

    return cookieHeader.split(';').reduce<Record<string, string>>((cookieMap, item) => {
        const splitIndex = item.indexOf('=')
        if (splitIndex === -1) {
            return cookieMap
        }

        const key = item.slice(0, splitIndex).trim()
        const value = decodeURIComponent(item.slice(splitIndex + 1).trim())
        cookieMap[key] = value
        return cookieMap
    }, {})
}

export const buildAuthCookie = (
    config: Pick<AuthKitConfig, 'cookieName' | 'cookieMaxAge'>,
    token: string,
    maxAge = config.cookieMaxAge,
) => {
    return `${config.cookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

export const clearAuthCookie = (config: Pick<AuthKitConfig, 'cookieName'>) => {
    return `${config.cookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}

export const readAuthToken = (
    config: Pick<AuthKitConfig, 'cookieName'>,
    cookieHeader?: string | null,
) => {
    const cookieMap = parseCookies(cookieHeader)
    return cookieMap[config.cookieName] ?? null
}

export const readGatewayUser = (headers: Headers) => {
    const userId = headers.get('x-user-id')
    const username = headers.get('x-username')

    if (!userId || !username) {
        return null
    }

    return {
        userId: Number(userId),
        username,
    }
}
