import type { GatewayServiceDefinition } from '../config/service-registry'

export const buildDatasourceNotifyUrl = (upstreamBaseUrl: string) => {
    return `${upstreamBaseUrl.replace(/\/$/, '')}/api/internal/datasource/apply`
}

export const toManagedServiceDefinition = (service: GatewayServiceDefinition) => ({
    serviceId: service.serviceId,
    upstream: service.upstream,
    notifyUrl: buildDatasourceNotifyUrl(service.upstream),
})
