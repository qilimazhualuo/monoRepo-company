import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export interface EnvConfig {
    port: number
    dbHost: string
    dbPort: number
    dbUser: string
    dbPassword: string
    dbName: string
    roadTable: string
    roadGeomColumn: string
    roadIdColumn: string
    routeBufferDeg: number
    routeMaxBufferDeg: number
    routeBufferStepDeg: number
    snapToleranceM: number
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

const loadEnvFile = () => {
    const envPath = resolve(serverRootDir, '.env')
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
    port: Number(readEnv('PORT', '9002')),
    dbHost: readEnv('DB_HOST', '127.0.0.1'),
    dbPort: Number(readEnv('DB_PORT', '5432')),
    dbUser: readEnv('DB_USER', 'postgres'),
    dbPassword: readEnv('DB_PASSWORD', 'postgres'),
    dbName: readEnv('DB_NAME', 'navigation'),
    roadTable: readEnv('ROAD_TABLE', 'roads'),
    roadGeomColumn: readEnv('ROAD_GEOM_COLUMN', 'geom'),
    roadIdColumn: readEnv('ROAD_ID_COLUMN', 'id'),
    routeBufferDeg: Number(readEnv('ROUTE_BUFFER_DEG', '0.15')),
    routeMaxBufferDeg: Number(readEnv('ROUTE_MAX_BUFFER_DEG', '0.8')),
    routeBufferStepDeg: Number(readEnv('ROUTE_BUFFER_STEP_DEG', '0.15')),
    snapToleranceM: Number(readEnv('SNAP_TOLERANCE_M', '500')),
}
