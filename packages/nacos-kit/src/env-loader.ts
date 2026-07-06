import { existsSync, readFileSync } from 'node:fs'

export const parseEnvValue = (rawValue: string): string => {
    let value = rawValue.trim()
    if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
    ) {
        value = value.slice(1, -1)
    }
    return value.replace(/\\n/g, '\n')
}

export const readEnv = (key: string, fallback = ''): string => {
    const rawValue = process.env[key]
    if (rawValue === undefined) {
        return fallback
    }
    return parseEnvValue(rawValue)
}

export const loadLocalEnvFile = (envFilePath: string) => {
    if (!existsSync(envFilePath)) {
        return
    }

    const envText = readFileSync(envFilePath, 'utf-8')
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

const isBootstrapKey = (key: string) => key.startsWith('NACOS_')

export const mergeRemoteConfig = (content: string) => {
    const trimmedContent = content.trim()
    if (!trimmedContent) {
        return
    }

    let configMap: Record<string, string> = {}

    if (trimmedContent.startsWith('{')) {
        const parsedJson = JSON.parse(trimmedContent) as Record<string, unknown>
        configMap = Object.fromEntries(
            Object.entries(parsedJson).map(([key, value]) => [key, String(value)]),
        )
    } else {
        trimmedContent.split('\n').forEach((line) => {
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
            configMap[key] = parseEnvValue(value)
        })
    }

    Object.entries(configMap).forEach(([key, value]) => {
        if (isBootstrapKey(key)) {
            return
        }
        process.env[key] = value
    })
}
