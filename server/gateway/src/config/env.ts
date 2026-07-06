import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initNacosKit, readEnv, resolveServiceEnvPath } from 'nacos-kit'
import { buildAuthKitConfig } from 'auth-kit'
import { buildServiceRegistry, type GatewayServiceDefinition } from './service-registry'

const serverRootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const defaultPublicDir = resolve(serverRootDir, '../../dist')

export interface EnvConfig {
    port: number
    authUpstream: string
    basicUpstream: string
    corsOrigin: string
    publicDir: string
    publicEnabled: boolean
    internalApiSecret: string
    serviceRegistry: GatewayServiceDefinition[]
    authConfig: ReturnType<typeof buildAuthKitConfig>
}

const buildEnv = (): EnvConfig => ({
    port: Number(readEnv('PORT', '9000')),
    authUpstream: readEnv('AUTH_UPSTREAM', 'http://127.0.0.1:9001'),
    basicUpstream: readEnv('BASIC_UPSTREAM', 'http://127.0.0.1:9002'),
    corsOrigin: readEnv('CORS_ORIGIN', 'http://localhost:3000'),
    publicDir: readEnv('PUBLIC_DIR', defaultPublicDir),
    publicEnabled: readEnv('PUBLIC_ENABLED', 'true') !== 'false',
    internalApiSecret: readEnv('INTERNAL_API_SECRET', 'mono-repo-internal-dev'),
    serviceRegistry: buildServiceRegistry(),
    authConfig: buildAuthKitConfig(readEnv),
})
export let env!: EnvConfig

export const initEnv = async () => {
    const bootstrapConfig = await initNacosKit({
        serviceName: 'gateway',
        configDataId: 'gateway',
        envFilePath: resolveServiceEnvPath(import.meta.url),
    })

    env = buildEnv()

    return bootstrapConfig
}
