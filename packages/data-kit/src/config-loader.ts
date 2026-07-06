import type { DataSourceConfig, LegacyDbEnv } from './types'

export const parseDataSourcesJson = (rawText: string): DataSourceConfig[] => {
    const trimmed = rawText.trim()
    if (!trimmed) {
        return []
    }

    const parsed = JSON.parse(trimmed) as DataSourceConfig[] | Record<string, Omit<DataSourceConfig, 'id'>>
    if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
            ...item,
            port: Number(item.port),
        }))
    }

    return Object.entries(parsed).map(([id, item]) => ({
        id,
        ...item,
        port: Number(item.port),
    }))
}

export const buildLegacyDataSource = (legacyEnv: LegacyDbEnv, sourceId = 'default'): DataSourceConfig => ({
    id: sourceId,
    name: '默认数据源',
    driver: legacyEnv.dbDriver,
    host: legacyEnv.dbHost,
    port: legacyEnv.dbPort,
    user: legacyEnv.dbUser,
    password: legacyEnv.dbPassword,
    database: legacyEnv.dbName,
    isDefault: true,
})

export const resolveDataSourceList = (
    dataSourcesJson: string,
    legacyEnv?: LegacyDbEnv,
    legacySourceId = 'default',
): DataSourceConfig[] => {
    if (dataSourcesJson.trim()) {
        return parseDataSourcesJson(dataSourcesJson)
    }

    if (legacyEnv) {
        return [buildLegacyDataSource(legacyEnv, legacySourceId)]
    }

    return []
}

export const pickDefaultSourceId = (sources: DataSourceConfig[], preferredId?: string) => {
    if (preferredId && sources.some((source) => source.id === preferredId)) {
        return preferredId
    }

    const defaultSource = sources.find((source) => source.isDefault)
    if (defaultSource) {
        return defaultSource.id
    }

    return sources[0]?.id ?? null
}
