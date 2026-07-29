import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

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

const readEnv = (key: string, fallback = '') => {
    const rawValue = process.env[key]
    if (rawValue === undefined) {
        return fallback
    }
    return parseEnvValue(rawValue)
}

export const env = {
    port: Number(readEnv('PORT', '9003')),
    uploadDir: resolve(serverRootDir, readEnv('UPLOAD_DIR', './uploads')),
    maxHeightmapSide: Number(readEnv('MAX_HEIGHTMAP_SIDE', '1024')),
}

mkdirSync(env.uploadDir, { recursive: true })
