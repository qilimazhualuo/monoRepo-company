import { readAuthToken } from './cookie'
import { getSession } from './session'
import { verifyAccessToken } from './token'

export type { AuthKitConfig, AuthUserContext, SessionRecord, TokenPayload } from './types'
export { createAccessToken, verifyAccessToken } from './token'
export {
    buildAuthCookie,
    clearAuthCookie,
    parseCookies,
    readAuthToken,
    readGatewayUser,
} from './cookie'
export {
    closeRedis,
    connectRedis,
    createSession,
    getRedis,
    getSession,
    initRedis,
    revokeSession,
} from './session'

export const buildAuthKitConfig = (readEnv: (key: string, fallback?: string) => string) => ({
    jwtSecret: readEnv('JWT_SECRET', 'mono-repo-dev-secret'),
    cookieName: readEnv('COOKIE_NAME', 'mono_token'),
    cookieMaxAge: Number(readEnv('COOKIE_MAX_AGE', '604800')),
    redisHost: readEnv('REDIS_HOST', '127.0.0.1'),
    redisPort: Number(readEnv('REDIS_PORT', '6379')),
    redisPassword: readEnv('REDIS_PASSWORD', ''),
    redisDb: Number(readEnv('REDIS_DB', '0')),
    sessionPrefix: readEnv('SESSION_PREFIX', 'mono:session:'),
})

export const resolveAuthUser = async (
    authConfig: ReturnType<typeof buildAuthKitConfig>,
    cookieHeader?: string | null,
) => {
    const token = readAuthToken(authConfig, cookieHeader)
    if (!token) {
        return null
    }

    const payload = verifyAccessToken(authConfig, token)
    if (!payload) {
        return null
    }

    const session = await getSession(authConfig, token)
    if (!session || session.userId !== payload.userId) {
        return null
    }

    return {
        userId: session.userId,
        username: session.username,
        token,
    }
}
