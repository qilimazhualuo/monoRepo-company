import { readEnv } from 'nacos-kit'

export interface GatewayServiceDefinition {
    serviceId: string
    upstream: string
}

const DATASOURCE_EXCLUDED_SERVICES = new Set(['gateway', 'basic'])

const parseGatewayServicesJson = (rawText: string): GatewayServiceDefinition[] => {
    const trimmed = rawText.trim()

    if (!trimmed) {
        return []
    }

    const parsed = JSON.parse(trimmed) as GatewayServiceDefinition[]

    return parsed.map((service) => ({
        serviceId: service.serviceId,
        upstream: service.upstream,
    }))
}

const buildDefaultServiceRegistry = (): GatewayServiceDefinition[] => {
    return [
        {
            serviceId: 'auth',
            upstream: readEnv('AUTH_UPSTREAM', 'http://127.0.0.1:9001'),
        },
        {
            serviceId: 'basic',
            upstream: readEnv('BASIC_UPSTREAM', 'http://127.0.0.1:9002'),
        },
    ]
}

export const buildServiceRegistry = (): GatewayServiceDefinition[] => {
    const configuredServices = parseGatewayServicesJson(readEnv('GATEWAY_SERVICES', ''))

    if (configuredServices.length > 0) {
        return configuredServices
    }

    return buildDefaultServiceRegistry()
}

export const getDatasourceManagedServices = (serviceRegistry: GatewayServiceDefinition[]) => {
    return serviceRegistry.filter((service) => !DATASOURCE_EXCLUDED_SERVICES.has(service.serviceId))
}
