export interface TokenPayload {
    userId: number
    username: string
    exp: number
}

export interface SessionRecord {
    userId: number
    username: string
}

export interface AuthKitConfig {
    jwtSecret: string
    cookieName: string
    cookieMaxAge: number
    redisHost: string
    redisPort: number
    redisPassword: string
    redisDb: number
    sessionPrefix: string
}

export interface AuthUserContext {
    userId: number
    username: string
}
