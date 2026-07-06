import { NacosNamingClient } from 'nacos'
import type { NacosBootstrapConfig, NacosServiceHandle } from './types'

export const registerNacosService = async (
    bootstrapConfig: NacosBootstrapConfig,
    port: number,
): Promise<NacosServiceHandle | null> => {
    if (!bootstrapConfig.enabled) {
        return null
    }

    const namingClient = new NacosNamingClient({
        logger: console,
        serverList: bootstrapConfig.serverAddr,
        namespace: bootstrapConfig.namespace,
        username: bootstrapConfig.username,
        password: bootstrapConfig.password,
    })

    await namingClient.ready()

    const instance = {
        ip: bootstrapConfig.serviceIp,
        port,
        ephemeral: true,
        weight: 1,
    }

    await namingClient.registerInstance(
        bootstrapConfig.serviceName,
        instance,
        bootstrapConfig.group,
    )

    console.log(
        `[nacos] 服务已注册: ${bootstrapConfig.serviceName}@${bootstrapConfig.serviceIp}:${port}`,
    )

    return {
        deregister: async () => {
            await namingClient.deregisterInstance(
                bootstrapConfig.serviceName,
                instance,
                bootstrapConfig.group,
            )
            console.log(`[nacos] 服务已注销: ${bootstrapConfig.serviceName}`)
        },
    }
}

export const bindNacosShutdown = (serviceHandle: NacosServiceHandle | null) => {
    if (!serviceHandle) {
        return
    }

    const shutdownHandler = async () => {
        await serviceHandle.deregister()
        process.exit(0)
    }

    process.once('SIGINT', shutdownHandler)
    process.once('SIGTERM', shutdownHandler)
}
