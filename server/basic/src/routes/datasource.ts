import { getDataSourceManager, pingDataSource } from 'data-kit'
import type { DataSourceConfig } from 'data-kit'
import { t } from 'elysia'
import type { BaseApp } from '../app'
import { getManagedServiceList } from '../services/service-registry'
import { reloadDbModule } from '../db'
import {
    applyManagedServiceDatasources,
    buildDefaultDatasourceFromEnv,
    listServiceDatasources,
    toPublicServiceDatasource,
} from '../services/service-datasource'
import { fail, maskPassword, success } from '../utils/response'

const dataSourceBody = t.Object({
    id: t.String(),
    name: t.String(),
    driver: t.Union([t.Literal('pg'), t.Literal('mysql')]),
    host: t.String(),
    port: t.Number(),
    user: t.String(),
    password: t.String(),
    database: t.String(),
    isDefault: t.Optional(t.Boolean()),
})

const mapBasicLocalSources = () => {
    const manager = getDataSourceManager()
    return manager.listSources()
}

export const registerDataSourceRoutes = <T extends BaseApp>(app: T) => app
    .get('/api/basic/datasources', () => {
        return success(mapBasicLocalSources())
    })
    .get('/api/basic/datasources/current', () => {
        const defaultConfig = buildDefaultDatasourceFromEnv()

        return success({
            id: defaultConfig.id,
            name: defaultConfig.name,
            driver: defaultConfig.driver,
            host: defaultConfig.host,
            port: defaultConfig.port,
            database: defaultConfig.database,
            user: defaultConfig.user,
            password: maskPassword(defaultConfig.password),
            isActive: true,
            fromEnv: true,
        })
    })
    .get('/api/basic/datasources/:id', ({ params, set }) => {
        const manager = getDataSourceManager()
        const config = manager.getSourceConfig(params.id)

        if (!config) {
            set.status = 404
            return fail('404', '数据源不存在')
        }

        return success({
            ...config,
            password: maskPassword(config.password),
            isActive: manager.getActiveSourceId() === config.id,
        })
    })
    .post('/api/basic/datasources/switch', async ({ body, set }) => {
        const manager = getDataSourceManager()

        try {
            const sourceList = manager.switchSource(body.sourceId)
            await reloadDbModule()
            return success(sourceList)
        } catch (error) {
            set.status = 404
            return fail('404', String(error))
        }
    }, {
        body: t.Object({
            sourceId: t.String(),
        }),
    })
    .post('/api/basic/datasources/reload', async ({ body, set }) => {
        const sourceList = body.sources as DataSourceConfig[]

        if (!Array.isArray(sourceList) || sourceList.length === 0) {
            set.status = 400
            return fail('400', 'sources 不能为空')
        }

        try {
            const serviceRecords = await applyManagedServiceDatasources(
                sourceList,
                body.defaultSourceId,
                body.serviceIds,
            )

            return success({
                basicSources: mapBasicLocalSources(),
                serviceDatasources: serviceRecords.map((record) => toPublicServiceDatasource(record)),
            })
        } catch (error) {
            set.status = 500
            return fail('500', String(error))
        }
    }, {
        body: t.Object({
            sources: t.Array(dataSourceBody),
            defaultSourceId: t.Optional(t.String()),
            serviceIds: t.Optional(t.Array(t.String())),
        }),
    })
    .post('/api/basic/datasources/test', async ({ body, set }) => {
        try {
            const latencyMs = await pingDataSource(body as DataSourceConfig)
            return success({
                ok: true,
                latencyMs,
            })
        } catch (error) {
            set.status = 500
            return fail('500', String(error))
        }
    }, {
        body: dataSourceBody,
    })
    .get('/api/basic/datasources-health', async () => {
        const manager = getDataSourceManager()
        return success(await manager.checkAllHealth())
    })
    .get('/api/basic/managed-services', () => {
        return success(getManagedServiceList().map((service) => service.serviceId))
    })
