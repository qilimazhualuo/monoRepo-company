import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { pickDefaultSourceId, resolveDataSourceList } from './config-loader'
import {
    createDriverClient,
    executeRawQuery,
    executeRawSql,
    pingDataSource,
} from './drivers/index'
import type {
    DataSourceConfig,
    DataSourceDriver,
    DataSourceHealth,
    DataSourceRuntime,
    LegacyDbEnv,
    QueryResult,
} from './types'

export type DrizzleDatabase = MySql2Database | PostgresJsDatabase

export class DataSourceManager {
    private readonly runtimes = new Map<string, DataSourceRuntime>()

    private activeSourceId: string | null = null

    private readonly autoCreateDb: boolean

    constructor(autoCreateDb = true) {
        this.autoCreateDb = autoCreateDb
    }

    async initFromConfig(
        dataSourcesJson: string,
        legacyEnv?: LegacyDbEnv,
        preferredSourceId?: string,
        legacySourceId = 'default',
    ) {
        const sourceList = resolveDataSourceList(dataSourcesJson, legacyEnv, legacySourceId)
        if (sourceList.length === 0) {
            throw new Error('[data-kit] 未配置任何数据源')
        }

        await this.reloadSources(sourceList, preferredSourceId)
    }

    async reloadSources(sourceList: DataSourceConfig[], preferredSourceId?: string) {
        await this.closeAll()

        for (const sourceConfig of sourceList) {
            const client = await createDriverClient(sourceConfig, this.autoCreateDb)
            this.runtimes.set(sourceConfig.id, {
                config: sourceConfig,
                drizzle: client.drizzle,
                driver: client.driver,
            })
        }

        this.activeSourceId = pickDefaultSourceId(sourceList, preferredSourceId)
        if (!this.activeSourceId) {
            throw new Error('[data-kit] 无法确定默认数据源')
        }

        console.log(`[data-kit] 已加载 ${sourceList.length} 个数据源，当前: ${this.activeSourceId}`)
    }

    listSources() {
        return [...this.runtimes.values()].map((runtime) => ({
            id: runtime.config.id,
            name: runtime.config.name,
            driver: runtime.config.driver,
            host: runtime.config.host,
            port: runtime.config.port,
            database: runtime.config.database,
            isDefault: runtime.config.id === this.activeSourceId,
            isActive: runtime.config.id === this.activeSourceId,
        }))
    }

    getSourceConfig(sourceId?: string) {
        const resolvedId = sourceId ?? this.activeSourceId
        if (!resolvedId) {
            return null
        }

        return this.runtimes.get(resolvedId)?.config ?? null
    }

    getActiveSourceId() {
        return this.activeSourceId
    }

    getActiveDriver(): DataSourceDriver {
        const runtime = this.getRuntime()
        return runtime.driver
    }

    switchSource(sourceId: string) {
        if (!this.runtimes.has(sourceId)) {
            throw new Error(`[data-kit] 数据源不存在: ${sourceId}`)
        }

        this.activeSourceId = sourceId
        console.log(`[data-kit] 已切换数据源: ${sourceId}`)
        return this.listSources()
    }

    getDb(sourceId?: string): DrizzleDatabase {
        return this.getRuntime(sourceId).drizzle as DrizzleDatabase
    }

    getMysqlDb(sourceId?: string) {
        const runtime = this.getRuntime(sourceId)
        if (runtime.driver !== 'mysql') {
            throw new Error('[data-kit] 当前数据源不是 MySQL')
        }
        return runtime.drizzle as MySql2Database
    }

    getPgDb(sourceId?: string) {
        const runtime = this.getRuntime(sourceId)
        if (runtime.driver !== 'pg') {
            throw new Error('[data-kit] 当前数据源不是 PostgreSQL')
        }
        return runtime.drizzle as PostgresJsDatabase
    }

    async executeQuery(sourceId: string | undefined, sqlText: string, params: unknown[] = []): Promise<QueryResult> {
        const config = this.getSourceConfig(sourceId)
        if (!config) {
            throw new Error('[data-kit] 数据源不存在')
        }

        return executeRawQuery(config, sqlText, params)
    }

    async executeSql(sourceId: string | undefined, sqlText: string) {
        const config = this.getSourceConfig(sourceId)
        if (!config) {
            throw new Error('[data-kit] 数据源不存在')
        }

        await executeRawSql(config, sqlText)
    }

    async checkHealth(sourceId?: string): Promise<DataSourceHealth> {
        const config = this.getSourceConfig(sourceId)
        if (!config) {
            throw new Error('[data-kit] 数据源不存在')
        }

        const startedAt = Date.now()
        try {
            const latencyMs = await pingDataSource(config)
            return {
                id: config.id,
                name: config.name,
                driver: config.driver,
                ok: true,
                latencyMs,
            }
        } catch (error) {
            return {
                id: config.id,
                name: config.name,
                driver: config.driver,
                ok: false,
                latencyMs: Date.now() - startedAt,
                message: String(error),
            }
        }
    }

    async checkAllHealth() {
        const healthList = await Promise.all(
            [...this.runtimes.keys()].map((sourceId) => this.checkHealth(sourceId)),
        )
        return healthList
    }

    private getRuntime(sourceId?: string): DataSourceRuntime {
        const resolvedId = sourceId ?? this.activeSourceId
        if (!resolvedId) {
            throw new Error('[data-kit] 当前未选择数据源')
        }

        const runtime = this.runtimes.get(resolvedId)
        if (!runtime) {
            throw new Error(`[data-kit] 数据源不存在: ${resolvedId}`)
        }

        return runtime
    }

    private async closeAll() {
        this.runtimes.clear()
        this.activeSourceId = null
    }
}

let globalManager: DataSourceManager | null = null

export interface InitDataSourcesOptions {
    autoCreateDb?: boolean
}

export const getDataSourceManager = (autoCreateDb = true) => {
    if (!globalManager) {
        globalManager = new DataSourceManager(autoCreateDb)
    }
    return globalManager
}

export const initDataSources = async (
    dataSourcesJson: string,
    legacyEnv?: LegacyDbEnv,
    preferredSourceId?: string,
    legacySourceId = 'default',
    options: InitDataSourcesOptions = {},
) => {
    const autoCreateDb = options.autoCreateDb ?? true
    const manager = getDataSourceManager(autoCreateDb)
    await manager.initFromConfig(dataSourcesJson, legacyEnv, preferredSourceId, legacySourceId)
    return manager
}

export const getDb = (sourceId?: string) => getDataSourceManager().getDb(sourceId)

export const getActiveDriver = () => getDataSourceManager().getActiveDriver()

export const switchDataSource = (sourceId: string) => getDataSourceManager().switchSource(sourceId)

export const applyDataSourceConfigs = async (
    sources: DataSourceConfig[],
    defaultSourceId?: string,
    options: { autoCreateDb?: boolean } = {},
) => {
    if (sources.length === 0) {
        throw new Error('[data-kit] 数据源配置不能为空')
    }

    const autoCreateDb = options.autoCreateDb ?? false
    const manager = getDataSourceManager(autoCreateDb)
    await manager.reloadSources(sources, defaultSourceId)
    return manager
}

export interface ServiceDatasourceReloadEvent {
    serviceId: string
    sources: DataSourceConfig[]
    defaultSourceId: string
}

export const buildServiceDatasourceChannel = (prefix: string) => `${prefix}reload`

export const parseServiceDatasourceEvent = (messageText: string): ServiceDatasourceReloadEvent => {
    return JSON.parse(messageText) as ServiceDatasourceReloadEvent
}

export const serializeServiceDatasourceEvent = (event: ServiceDatasourceReloadEvent) => {
    return JSON.stringify(event)
}
