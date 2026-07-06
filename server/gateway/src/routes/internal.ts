import type { Elysia } from 'elysia'
import { env } from '../config/env'
import { getDatasourceManagedServices } from '../config/service-registry'
import { toManagedServiceDefinition } from '../utils/service'

const success = <T>(data: T) => ({
    code: '200',
    data,
})

const fail = (code: string, message: string) => ({
    code,
    data: message,
})

const verifyInternalSecret = (secretHeader?: string | null) => {
    return secretHeader === env.internalApiSecret
}

export const registerGatewayInternalRoutes = <T extends Elysia>(app: T) => app
    .get('/api/gateway/internal/services', ({ request, set }) => {
        if (!verifyInternalSecret(request.headers.get('x-internal-secret'))) {
            set.status = 403
            return fail('403', '无权访问内部接口')
        }

        const managedServices = getDatasourceManagedServices(env.serviceRegistry)
            .map((service) => toManagedServiceDefinition(service))

        return success(managedServices)
    })
