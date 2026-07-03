import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface SharedChunksEnv {
    packages: string[]
    publicPath: string
    consumerApps: string[]
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

export const loadSharedChunksEnv = (envFilePath?: string): SharedChunksEnv => {
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

    const packagesText = envMap.PACKAGES ?? ''
    const packages = packagesText
        .split(',')
        .map((packageName) => packageName.trim())
        .filter(Boolean)

    const consumerAppsText = envMap.CONSUMER_APPS ?? ''
    const consumerApps = consumerAppsText
        .split(',')
        .map((appName) => appName.trim())
        .filter(Boolean)

    return {
        packages,
        publicPath: envMap.PUBLIC_PATH || '/shared/',
        consumerApps,
    }
}

export const createRulesFromPackages = (packages: string[]) => {
    return packages.map((packageName) => ({ packageName }))
}
