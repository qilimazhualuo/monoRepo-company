import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface AppBaseEnv {
    hostAppName: string
}

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const parseEnvValue = (rawValue: string): string => {
    let value = rawValue.trim()
    if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1)
    }
    return value
}

export const loadAppBaseEnv = (envFilePath?: string): AppBaseEnv => {
    const resolvedEnvPath = envFilePath ?? resolve(pluginRoot, '.env')
    const envMap: Record<string, string> = {}

    if (existsSync(resolvedEnvPath)) {
        const envText = readFileSync(resolvedEnvPath, 'utf-8')
        envText.split('\n').forEach((line) => {
            const trimmedLine = line.trim()
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                return
            }

            const splitIndex = trimmedLine.indexOf('=')
            if (splitIndex === -1) {
                return
            }

            const key = trimmedLine.slice(0, splitIndex).trim()
            const value = trimmedLine.slice(splitIndex + 1).trim()
            envMap[key] = parseEnvValue(value)
        })
    }

    return {
        hostAppName: envMap.HOST_APP_NAME || 'main',
    }
}
