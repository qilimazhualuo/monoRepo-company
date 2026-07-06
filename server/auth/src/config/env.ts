import { buildAuthKitConfig } from 'auth-kit'
import { initNacosKit, readEnv, resolveServiceEnvPath } from 'nacos-kit'

export interface EnvConfig {
    port: number
    authConfig: ReturnType<typeof buildAuthKitConfig>
    corsOrigin: string
    defaultAdminUsername: string
    defaultAdminPassword: string
    rsaPublicKey: string
    rsaPrivateKey: string
    basicServiceUrl: string
    serviceId: string
    internalApiSecret: string
    datasourceNotifyPrefix: string
}

const buildEnv = (): EnvConfig => ({
    port: Number(readEnv('PORT', '9001')),
    authConfig: buildAuthKitConfig(readEnv),
    corsOrigin: readEnv('CORS_ORIGIN', 'http://localhost:3000'),
    defaultAdminUsername: readEnv('DEFAULT_ADMIN_USERNAME', 'admin'),
    defaultAdminPassword: readEnv('DEFAULT_ADMIN_PASSWORD', 'admin123'),
    rsaPublicKey: readEnv('RSA_PUBLIC_KEY'),
    rsaPrivateKey: readEnv('RSA_PRIVATE_KEY'),
    basicServiceUrl: readEnv('BASIC_SERVICE_URL', 'http://127.0.0.1:9002'),
    serviceId: readEnv('SERVICE_ID', 'auth'),
    internalApiSecret: readEnv('INTERNAL_API_SECRET', 'mono-repo-internal-dev'),
    datasourceNotifyPrefix: readEnv('DATASOURCE_NOTIFY_PREFIX', 'mono:service-datasource:'),
})

export let env!: EnvConfig

export const initEnv = async () => {
    const bootstrapConfig = await initNacosKit({
        serviceName: 'auth',
        configDataId: 'auth',
        envFilePath: resolveServiceEnvPath(import.meta.url),
    })

    env = buildEnv()

    return bootstrapConfig
}
