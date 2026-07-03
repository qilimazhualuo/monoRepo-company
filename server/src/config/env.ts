import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const defaultPublicDir = resolve(serverRootDir, '../dist')

export interface EnvConfig {
    port: number
    publicDir: string
    publicEnabled: boolean
    dbDriver: 'pg' | 'mysql'
    dbHost: string
    dbPort: number
    dbUser: string
    dbPassword: string
    dbName: string
    jwtSecret: string
    cookieName: string
    cookieMaxAge: number
    corsOrigin: string
    defaultAdminUsername: string
    defaultAdminPassword: string
    rsaPublicKey: string
    rsaPrivateKey: string
}

const parseEnvValue = (rawValue: string): string => {
    let value = rawValue.trim()
    if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1)
    }
    return value.replace(/\\n/g, '\n')
}

const readEnv = (key: string, fallback = ''): string => {
    const rawValue = process.env[key]
    if (rawValue === undefined) {
        return fallback
    }
    return parseEnvValue(rawValue)
}

export const loadEnvFile = () => {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const envPath = resolve(currentDir, '../../.env')

    if (!existsSync(envPath)) {
        return
    }

    const envText = readFileSync(envPath, 'utf-8')
    envText.split('\n').forEach((line) => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) {
            return
        }

        const splitIndex = trimmed.indexOf('=')
        if (splitIndex === -1) {
            return
        }

        const key = trimmed.slice(0, splitIndex).trim()
        const value = trimmed.slice(splitIndex + 1).trim()
        if (!process.env[key]) {
            process.env[key] = parseEnvValue(value)
        }
    })
}

loadEnvFile()

export const env: EnvConfig = {
    port: Number(readEnv('PORT', '9001')),
    publicDir: readEnv('PUBLIC_DIR', defaultPublicDir),
    publicEnabled: readEnv('PUBLIC_ENABLED', 'true') !== 'false',
    dbDriver: (readEnv('DB_DRIVER', 'pg') as 'pg' | 'mysql'),
    dbHost: readEnv('DB_HOST', '127.0.0.1'),
    dbPort: Number(readEnv('DB_PORT', readEnv('DB_DRIVER', 'pg') === 'mysql' ? '3306' : '5432')),
    dbUser: readEnv('DB_USER', 'postgres'),
    dbPassword: readEnv('DB_PASSWORD', 'postgres'),
    dbName: readEnv('DB_NAME', 'mono_repo'),
    jwtSecret: readEnv('JWT_SECRET', 'mono-repo-dev-secret'),
    cookieName: readEnv('COOKIE_NAME', 'mono_token'),
    cookieMaxAge: Number(readEnv('COOKIE_MAX_AGE', '604800')),
    corsOrigin: readEnv('CORS_ORIGIN', 'http://localhost:8080'),
    defaultAdminUsername: readEnv('DEFAULT_ADMIN_USERNAME', 'admin'),
    defaultAdminPassword: readEnv('DEFAULT_ADMIN_PASSWORD', 'admin123'),
    rsaPublicKey: readEnv('RSA_PUBLIC_KEY'),
    rsaPrivateKey: readEnv('RSA_PRIVATE_KEY'),
}
