import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadLocalEnvFile } from './env-loader'
import { loadNacosRemoteConfig } from './nacos-config'
import { bindNacosShutdown, registerNacosService } from './nacos-naming'
import type { NacosKitOptions, NacosServiceHandle } from './types'

export type { NacosBootstrapConfig, NacosKitOptions, NacosServiceHandle } from './types'
export { loadLocalEnvFile, mergeRemoteConfig, parseEnvValue, readEnv } from './env-loader'
export { readNacosBootstrapConfig } from './nacos-config'
export { listNacosServiceNames } from './nacos-discovery'

export const initNacosKit = async (options: NacosKitOptions) => {
    loadLocalEnvFile(options.envFilePath)

    const bootstrapConfig = await loadNacosRemoteConfig(
        options.serviceName,
        options.configDataId,
    )

    return bootstrapConfig
}

export const startNacosService = async (
    bootstrapConfig: Awaited<ReturnType<typeof loadNacosRemoteConfig>>,
    port: number,
) => {
    const serviceHandle = await registerNacosService(bootstrapConfig, port)
    bindNacosShutdown(serviceHandle)
    return serviceHandle
}

export const resolveServiceEnvPath = (importMetaUrl: string) => {
    const currentDir = dirname(fileURLToPath(importMetaUrl))
    return resolve(currentDir, '../../.env')
}
