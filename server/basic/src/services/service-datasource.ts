import {
    buildLegacyDbEnv,
    buildServiceDatasourceChannel,
    ensureDatabaseExists,
    getActiveDriver,
    getDataSourceManager,
    serializeServiceDatasourceEvent,
    type DataSourceConfig,
} from 'data-kit'
import { getRedis } from 'auth-kit'
import { readEnv } from 'nacos-kit'
import type { NacosBootstrapConfig } from 'nacos-kit'
import { env } from '../config/env'
import {
    getManagedServiceList,
    resolveManagedServices,
    findManagedService,
} from './service-registry'

export interface ServiceDatasourceRecord {
    serviceId: string
    sourceId: string
    name: string
    driver: DataSourceConfig['driver']
    host: string
    port: number
    user: string
    password: string
    database: string
    updatedAt?: string
}

const mapRowToRecord = (row: Record<string, unknown>): ServiceDatasourceRecord => ({
    serviceId: String(row.service_id),
    sourceId: String(row.source_id),
    name: String(row.name),
    driver: String(row.driver) as DataSourceConfig['driver'],
    host: String(row.host),
    port: Number(row.port),
    user: String(row.db_user),
    password: String(row.db_password),
    database: String(row.database_name),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
})

const mapRecordToConfig = (record: ServiceDatasourceRecord): DataSourceConfig => ({
    id: record.sourceId,
    name: record.name,
    driver: record.driver,
    host: record.host,
    port: record.port,
    user: record.user,
    password: record.password,
    database: record.database,
    isDefault: true,
})

export const buildDefaultDatasourceFromEnv = (): DataSourceConfig => {
    const legacyEnv = buildLegacyDbEnv(readEnv)
    return {
        id: readEnv('DEFAULT_DATASOURCE', 'basic_default'),
        name: 'basic 默认数据源',
        driver: legacyEnv.dbDriver,
        host: legacyEnv.dbHost,
        port: legacyEnv.dbPort,
        user: legacyEnv.dbUser,
        password: legacyEnv.dbPassword,
        database: legacyEnv.dbName,
        isDefault: true,
    }
}

export const buildDefaultDatasourceForService = (serviceId: string): DataSourceConfig => {
    const legacyEnv = buildLegacyDbEnv(readEnv)

    return {
        id: `${serviceId}_default`,
        name: `${serviceId} 默认数据源`,
        driver: legacyEnv.dbDriver,
        host: legacyEnv.dbHost,
        port: legacyEnv.dbPort,
        user: legacyEnv.dbUser,
        password: legacyEnv.dbPassword,
        database: serviceId,
        isDefault: true,
    }
}

const buildUpsertSql = (record: ServiceDatasourceRecord) => {
    const driver = getActiveDriver()

    if (driver === 'mysql') {
        return {
            sql: `INSERT INTO sys_service_datasource
                (service_id, source_id, name, driver, host, port, db_user, db_password, database_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                source_id = VALUES(source_id),
                name = VALUES(name),
                driver = VALUES(driver),
                host = VALUES(host),
                port = VALUES(port),
                db_user = VALUES(db_user),
                db_password = VALUES(db_password),
                database_name = VALUES(database_name),
                updated_at = CURRENT_TIMESTAMP`,
            params: [
                record.serviceId,
                record.sourceId,
                record.name,
                record.driver,
                record.host,
                record.port,
                record.user,
                record.password,
                record.database,
            ],
        }
    }

    return {
        sql: `INSERT INTO sys_service_datasource
            (service_id, source_id, name, driver, host, port, db_user, db_password, database_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (service_id) DO NOTHING`,
        params: [
            record.serviceId,
            record.sourceId,
            record.name,
            record.driver,
            record.host,
            record.port,
            record.user,
            record.password,
            record.database,
        ],
    }
}

const buildUpdateSql = (record: ServiceDatasourceRecord) => {
    const driver = getActiveDriver()

    if (driver === 'mysql') {
        return {
            sql: `UPDATE sys_service_datasource SET
                source_id = ?,
                name = ?,
                driver = ?,
                host = ?,
                port = ?,
                db_user = ?,
                db_password = ?,
                database_name = ?,
                updated_at = CURRENT_TIMESTAMP
                WHERE service_id = ?`,
            params: [
                record.sourceId,
                record.name,
                record.driver,
                record.host,
                record.port,
                record.user,
                record.password,
                record.database,
                record.serviceId,
            ],
        }
    }

    return {
        sql: `UPDATE sys_service_datasource SET
            source_id = $2,
            name = $3,
            driver = $4,
            host = $5,
            port = $6,
            db_user = $7,
            db_password = $8,
            database_name = $9,
            updated_at = NOW()
            WHERE service_id = $1`,
        params: [
            record.serviceId,
            record.sourceId,
            record.name,
            record.driver,
            record.host,
            record.port,
            record.user,
            record.password,
            record.database,
        ],
    }
}

export const listServiceDatasources = async () => {
    const manager = getDataSourceManager()
    const result = await manager.executeQuery(
        undefined,
        'SELECT * FROM sys_service_datasource ORDER BY service_id ASC',
    )

    return result.rows.map((row) => mapRowToRecord(row))
}

export const getServiceDatasource = async (serviceId: string) => {
    const manager = getDataSourceManager()
    const driver = getActiveDriver()
    const sqlText = driver === 'mysql'
        ? 'SELECT * FROM sys_service_datasource WHERE service_id = ? LIMIT 1'
        : 'SELECT * FROM sys_service_datasource WHERE service_id = $1 LIMIT 1'

    const result = await manager.executeQuery(undefined, sqlText, [serviceId])
    const row = result.rows[0]

    if (!row) {
        return null
    }

    return mapRowToRecord(row)
}

export const saveServiceDatasource = async (record: ServiceDatasourceRecord) => {
    const manager = getDataSourceManager()
    const existingRecord = await getServiceDatasource(record.serviceId)
    const query = existingRecord ? buildUpdateSql(record) : buildUpsertSql(record)

    await manager.executeQuery(undefined, query.sql, query.params)
}

export const seedManagedServiceDatasources = async (nacosBootstrapConfig: NacosBootstrapConfig) => {
    const managedServices = await resolveManagedServices(nacosBootstrapConfig)

    if (managedServices.length === 0) {
        console.warn('[basic] 未找到需要配置数据源的微服务，跳过默认数据源创建')
        return
    }

    for (const managedService of managedServices) {
        const existingRecord = await getServiceDatasource(managedService.serviceId)

        if (existingRecord) {
            console.log(`[basic] 微服务数据源已存在，跳过: ${managedService.serviceId}`)
            continue
        }

        const defaultConfig = buildDefaultDatasourceForService(managedService.serviceId)

        await ensureDatabaseExists(defaultConfig)

        await saveServiceDatasource({
            serviceId: managedService.serviceId,
            sourceId: defaultConfig.id,
            name: defaultConfig.name,
            driver: defaultConfig.driver,
            host: defaultConfig.host,
            port: defaultConfig.port,
            user: defaultConfig.user,
            password: defaultConfig.password,
            database: defaultConfig.database,
        })

        console.log(`[basic] 已为微服务创建默认数据源: ${managedService.serviceId} -> ${defaultConfig.database}`)
    }
}

const publishDatasourceEvent = async (
    serviceId: string,
    sources: DataSourceConfig[],
    defaultSourceId: string,
) => {
    const redis = getRedis()
    const channel = buildServiceDatasourceChannel(env.datasourceNotifyPrefix)

    await redis.publish(channel, serializeServiceDatasourceEvent({
        serviceId,
        sources,
        defaultSourceId,
    }))
}

const notifyServiceByHttp = async (
    notifyUrl: string,
    sources: DataSourceConfig[],
    defaultSourceId: string,
) => {
    const response = await fetch(notifyUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': env.internalApiSecret,
        },
        body: JSON.stringify({
            sources,
            defaultSourceId,
        }),
    })

    if (!response.ok) {
        const responseText = await response.text()
        throw new Error(`HTTP ${response.status}: ${responseText}`)
    }
}

export const notifyManagedServiceDatasource = async (
    serviceId: string,
    sources: DataSourceConfig[],
    defaultSourceId: string,
) => {
    const managedService = findManagedService(serviceId)

    if (!managedService) {
        return
    }

    await publishDatasourceEvent(serviceId, sources, defaultSourceId)

    try {
        await notifyServiceByHttp(managedService.notifyUrl, sources, defaultSourceId)
        console.log(`[basic] 已通知微服务切换数据源: ${serviceId}`)
    } catch (error) {
        console.warn(`[basic] 通知 ${serviceId} 失败（可依赖 Redis 订阅）:`, error)
    }
}

export const applyManagedServiceDatasources = async (
    sources: DataSourceConfig[],
    defaultSourceId?: string,
    targetServiceIds?: string[],
) => {
    const resolvedDefaultSourceId = defaultSourceId ?? sources.find((source) => source.isDefault)?.id ?? sources[0]?.id

    if (!resolvedDefaultSourceId) {
        throw new Error('无法确定默认数据源')
    }

    const activeConfig = sources.find((source) => source.id === resolvedDefaultSourceId) ?? sources[0]

    if (!activeConfig) {
        throw new Error('数据源配置无效')
    }

    const serviceIds = targetServiceIds?.length
        ? targetServiceIds
        : getManagedServiceList().map((service) => service.serviceId)

    for (const serviceId of serviceIds) {
        await saveServiceDatasource({
            serviceId,
            sourceId: activeConfig.id,
            name: activeConfig.name,
            driver: activeConfig.driver,
            host: activeConfig.host,
            port: activeConfig.port,
            user: activeConfig.user,
            password: activeConfig.password,
            database: activeConfig.database,
        })

        await notifyManagedServiceDatasource(serviceId, sources, resolvedDefaultSourceId)
    }

    return listServiceDatasources()
}

export const toPublicServiceDatasource = (record: ServiceDatasourceRecord) => ({
    ...record,
    password: record.password.length <= 2
        ? '*'.repeat(record.password.length)
        : `${record.password.slice(0, 1)}${'*'.repeat(Math.min(record.password.length - 2, 8))}${record.password.slice(-1)}`,
})

export const buildServiceApplyPayload = async (serviceId: string) => {
    const record = await getServiceDatasource(serviceId)

    if (!record) {
        return null
    }

    const config = mapRecordToConfig(record)

    return {
        sources: [config],
        defaultSourceId: config.id,
    }
}

export { mapRecordToConfig }
