import { createHash, randomBytes } from 'node:crypto'
import Redis from 'ioredis'
import { env } from '../config/env'

export interface SessionRecord {
    userId: number
    username: string
}

let redisClient: Redis | null = null

export const createSessionToken = () => randomBytes(32).toString('base64url')

const buildSessionKey = (token: string) => {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    return `${env.sessionPrefix}${tokenHash}`
}

export const initRedis = () => {
    if (redisClient) {
        return redisClient
    }

    redisClient = new Redis({
        host: env.redisHost,
        port: env.redisPort,
        password: env.redisPassword || undefined,
        db: env.redisDb,
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

export const createSession = async (token: string, session: SessionRecord) => {
    const redis = getRedis()
    const sessionKey = buildSessionKey(token)
    await redis.set(sessionKey, JSON.stringify(session), 'EX', env.cookieMaxAge)
}

export const getSession = async (token: string): Promise<SessionRecord | null> => {
    const redis = getRedis()
    const sessionKey = buildSessionKey(token)
    const sessionText = await redis.get(sessionKey)

    if (!sessionText) {
        return null
    }

    return JSON.parse(sessionText) as SessionRecord
}

export const revokeSession = async (token: string) => {
    const redis = getRedis()
    const sessionKey = buildSessionKey(token)
    await redis.del(sessionKey)
}

export const closeRedis = async () => {
    if (!redisClient) {
        return
    }

    await redisClient.quit()
    redisClient = null
}
