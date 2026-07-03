import { env } from '../config/env'
import type { UserRecord } from '../models/user'

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

export const buildAuthCookie = (token: string, maxAge = env.cookieMaxAge) => {
    return `${env.cookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

export const clearAuthCookie = () => {
    return `${env.cookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}

export const toPublicUser = (user: UserRecord) => ({
    id: user.id,
    username: user.username,
    nickname: user.nickname,
})
