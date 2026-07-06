import { buildAuthKitConfig } from 'auth-kit'
import { initNacosKit, readEnv, resolveServiceEnvPath } from 'nacos-kit'

export interface EnvConfig {
    port: number
    corsOrigin: string
    gatewayServiceUrl: string
    authServiceUrl: string
    internalApiSecret: string
    datasourceNotifyPrefix: string
    authConfig: ReturnType<typeof buildAuthKitConfig>
}

const buildEnv = (): EnvConfig => ({
    port: Number(readEnv('PORT', '9002')),
    corsOrigin: readEnv('CORS_ORIGIN', 'http://localhost:3000'),
    gatewayServiceUrl: readEnv('GATEWAY_SERVICE_URL', 'http://127.0.0.1:9000'),
    authServiceUrl: readEnv('AUTH_SERVICE_URL', 'http://127.0.0.1:9001'),
    internalApiSecret: readEnv('INTERNAL_API_SECRET', 'mono-repo-internal-dev'),
    datasourceNotifyPrefix: readEnv('DATASOURCE_NOTIFY_PREFIX', 'mono:service-datasource:'),
    authConfig: buildAuthKitConfig(readEnv),
})

export let env!: EnvConfig

export const initEnv = async () => {
    const bootstrapConfig = await initNacosKit({
        serviceName: 'basic',
        configDataId: 'basic',
        envFilePath: resolveServiceEnvPath(import.meta.url),
    })

    env = buildEnv()

    return bootstrapConfig
}
