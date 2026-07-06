import { createHash } from 'node:crypto'
import Redis from 'ioredis'
import type { AuthKitConfig, SessionRecord } from './types'

let redisClient: Redis | null = null

const buildSessionKey = (config: Pick<AuthKitConfig, 'sessionPrefix'>, token: string) => {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    return `${config.sessionPrefix}${tokenHash}`
}

export const initRedis = (config: Pick<AuthKitConfig, 'redisHost' | 'redisPort' | 'redisPassword' | 'redisDb'>) => {
    if (redisClient) {
        return redisClient
    }

    redisClient = new Redis({
        host: config.redisHost,
        port: config.redisPort,
        password: config.redisPassword || undefined,
        db: config.redisDb,
        maxRetriesPerRequest: 3,
    })

    return redisClient
}

export const connectRedis = async () => {
    const redis = getRedis()
    await redis.ping()
}

export const getRedis = () => {
    if (!redisClient) {
        throw new Error('Redis 未初始化，请先调用 initRedis()')
    }
    return redisClient
}

export const createSession = async (
    config: Pick<AuthKitConfig, 'sessionPrefix' | 'cookieMaxAge'>,
    token: string,
    session: SessionRecord,
) => {
    const redis = getRedis()
    const sessionKey = buildSessionKey(config, token)
    await redis.set(sessionKey, JSON.stringify(session), 'EX', config.cookieMaxAge)
}

export const getSession = async (
    config: Pick<AuthKitConfig, 'sessionPrefix'>,
    token: string,
): Promise<SessionRecord | null> => {
    const redis = getRedis()
    const sessionKey = buildSessionKey(config, token)
    const sessionText = await redis.get(sessionKey)

    if (!sessionText) {
        return null
    }

    return JSON.parse(sessionText) as SessionRecord
}

export const revokeSession = async (
    config: Pick<AuthKitConfig, 'sessionPrefix'>,
    token: string,
) => {
    const redis = getRedis()
    const sessionKey = buildSessionKey(config, token)
    await redis.del(sessionKey)
}

export const closeRedis = async () => {
    if (!redisClient) {
        return
    }

    await redisClient.quit()
    redisClient = null
}
