import { NacosConfigClient } from 'nacos'
import type { NacosBootstrapConfig } from './types'
import { mergeRemoteConfig, readEnv } from './env-loader'

export const readNacosBootstrapConfig = (
    serviceName: string,
    configDataId: string,
): NacosBootstrapConfig => ({
    enabled: readEnv('NACOS_ENABLED', 'false') === 'true',
    serverAddr: readEnv('NACOS_SERVER_ADDR', '127.0.0.1:8848'),
    namespace: readEnv('NACOS_NAMESPACE', 'public'),
    group: readEnv('NACOS_GROUP', 'MONO_REPO'),
    configDataId: readEnv('NACOS_CONFIG_DATA_ID', configDataId),
    serviceName: readEnv('NACOS_SERVICE_NAME', serviceName),
    serviceIp: readEnv('NACOS_SERVICE_IP', '127.0.0.1'),
    username: readEnv('NACOS_USERNAME', 'admin'),
    password: readEnv('NACOS_PASSWORD', '123zhangbei'),
})

export const loadNacosRemoteConfig = async (
    serviceName: string,
    configDataId: string,
) => {
    const bootstrapConfig = readNacosBootstrapConfig(serviceName, configDataId)
    if (!bootstrapConfig.enabled) {
        console.log(`[nacos] 未启用，跳过远程配置加载: ${serviceName}`)
        return bootstrapConfig
    }

    const configClient = new NacosConfigClient({
        serverAddr: bootstrapConfig.serverAddr,
        namespace: bootstrapConfig.namespace,
        username: bootstrapConfig.username,
        password: bootstrapConfig.password,
    })

    const remoteContent = await configClient.getConfig(
        bootstrapConfig.configDataId,
        bootstrapConfig.group,
    )

    if (!remoteContent) {
        console.warn(
            `[nacos] 远程配置为空，使用本地 .env: dataId=${bootstrapConfig.configDataId}, group=${bootstrapConfig.group}`,
        )
        return bootstrapConfig
    }

    mergeRemoteConfig(remoteContent)
    console.log(
        `[nacos] 已加载远程配置: dataId=${bootstrapConfig.configDataId}, group=${bootstrapConfig.group}`,
    )

    return bootstrapConfig
}
