import { listNacosServiceNames, type NacosBootstrapConfig } from 'nacos-kit'
import { env } from '../config/env'

export interface ManagedServiceDefinition {
    serviceId: string
    upstream: string
    notifyUrl: string
}

let cachedManagedServices: ManagedServiceDefinition[] = []

const sleep = (delayMs: number) => new Promise((resolve) => {
    setTimeout(resolve, delayMs)
})

const buildNotifyUrl = (upstreamBaseUrl: string) => {
    return `${upstreamBaseUrl.replace(/\/$/, '')}/api/internal/datasource/apply`
}

const buildManagedServiceFromGateway = (service: {
    serviceId: string
    upstream: string
    notifyUrl?: string
}): ManagedServiceDefinition => ({
    serviceId: service.serviceId,
    upstream: service.upstream,
    notifyUrl: service.notifyUrl ?? buildNotifyUrl(service.upstream),
})

const fetchServicesFromGateway = async () => {
    const requestUrl = `${env.gatewayServiceUrl}/api/gateway/internal/services`
    const maxRetryCount = 30
    const retryDelayMs = 1000

    for (let attemptIndex = 0; attemptIndex < maxRetryCount; attemptIndex += 1) {
        try {
            const response = await fetch(requestUrl, {
                headers: {
                    'x-internal-secret': env.internalApiSecret,
                },
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const result = await response.json() as {
                code: string
                data: Array<{
                    serviceId: string
                    upstream: string
                    notifyUrl: string
                }>
            }

            if (result.code !== '200' || !Array.isArray(result.data)) {
                throw new Error('gateway 返回格式无效')
            }

            return result.data.map((service) => buildManagedServiceFromGateway(service))
        } catch (error) {
            if (attemptIndex === maxRetryCount - 1) {
                console.warn(`[basic] 从 gateway 获取服务列表失败: ${String(error)}`)
                return []
            }

            console.warn(`[basic] 等待 gateway 就绪 (${attemptIndex + 1}/${maxRetryCount})...`)
            await sleep(retryDelayMs)
        }
    }

    return []
}

const fetchServicesFromNacos = async (nacosBootstrapConfig: NacosBootstrapConfig) => {
    try {
        const serviceNames = await listNacosServiceNames(nacosBootstrapConfig)

        return serviceNames.map((serviceName) => {
            const upstream = readServiceUpstream(serviceName)

            return {
                serviceId: serviceName,
                upstream,
                notifyUrl: buildNotifyUrl(upstream),
            }
        })
    } catch (error) {
        console.warn(`[basic] 从 nacos 获取服务列表失败: ${String(error)}`)
        return []
    }
}

const readServiceUpstream = (serviceId: string) => {
    if (serviceId === 'auth') {
        return env.authServiceUrl
    }

    return `http://127.0.0.1:9001`
}

export const getManagedServiceList = () => cachedManagedServices

export const resolveManagedServices = async (nacosBootstrapConfig: NacosBootstrapConfig) => {
    const gatewayServices = await fetchServicesFromGateway()

    if (gatewayServices.length > 0) {
        console.log(`[basic] 从 gateway 发现 ${gatewayServices.length} 个待配置微服务`)
        cachedManagedServices = gatewayServices
        return gatewayServices
    }

    const nacosServices = await fetchServicesFromNacos(nacosBootstrapConfig)

    if (nacosServices.length > 0) {
        console.log(`[basic] 从 nacos 发现 ${nacosServices.length} 个待配置微服务`)
        cachedManagedServices = nacosServices
        return nacosServices
    }

    console.warn('[basic] gateway / nacos 均未发现可配置微服务')
    cachedManagedServices = []
    return []
}

export const findManagedService = (serviceId: string) => {
    return cachedManagedServices.find((service) => service.serviceId === serviceId) ?? null
}
