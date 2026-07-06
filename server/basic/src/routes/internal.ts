import type { BaseApp } from '../app'
import { env } from '../config/env'
import {
    buildServiceApplyPayload,
    getServiceDatasource,
    listServiceDatasources,
    toPublicServiceDatasource,
} from '../services/service-datasource'
import { fail, success } from '../utils/response'

const verifyInternalSecret = (secretHeader?: string | null) => {
    return secretHeader === env.internalApiSecret
}

export const registerInternalRoutes = <T extends BaseApp>(app: T) => app
    .get('/api/basic/internal/service-datasources/:serviceId', async ({ params, request, set }) => {
        if (!verifyInternalSecret(request.headers.get('x-internal-secret'))) {
            set.status = 403
            return fail('403', '无权访问内部接口')
        }

        const payload = await buildServiceApplyPayload(params.serviceId)

        if (!payload) {
            set.status = 404
            return fail('404', '微服务数据源不存在')
        }

        return success(payload)
    })
    .get('/api/basic/internal/health', ({ request, set }) => {
        if (!verifyInternalSecret(request.headers.get('x-internal-secret'))) {
            set.status = 403
            return fail('403', '无权访问内部接口')
        }

        return success({ ready: true })
    })

export const registerServiceDatasourceRoutes = <T extends BaseApp>(app: T) => app
    .get('/api/basic/service-datasources', async () => {
        const recordList = await listServiceDatasources()
        return success(recordList.map((record) => toPublicServiceDatasource(record)))
    })
    .get('/api/basic/service-datasources/:serviceId', async ({ params, set }) => {
        const record = await getServiceDatasource(params.serviceId)

        if (!record) {
            set.status = 404
            return fail('404', '微服务数据源不存在')
        }

        return success(toPublicServiceDatasource(record))
    })
