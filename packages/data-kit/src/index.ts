export type {
    DataSourceConfig,
    DataSourceDriver,
    DataSourceHealth,
    DataSourceRuntime,
    LegacyDbEnv,
    QueryRequest,
    QueryResult,
} from './types'

export {
    buildLegacyDataSource,
    parseDataSourcesJson,
    pickDefaultSourceId,
    resolveDataSourceList,
} from './config-loader'

export {
    createDriverClient,
    createMysqlClient,
    createPgClient,
    ensureDatabaseExists,
    executeRawQuery,
    executeRawSql,
    pingDataSource,
} from './drivers/index'

export type {
    DrizzleDatabase,
    InitDataSourcesOptions,
    ServiceDatasourceReloadEvent,
} from './manager'

export {
    DataSourceManager,
    applyDataSourceConfigs,
    buildServiceDatasourceChannel,
    getActiveDriver,
    getDataSourceManager,
    getDb,
    initDataSources,
    parseServiceDatasourceEvent,
    serializeServiceDatasourceEvent,
    switchDataSource,
} from './manager'

export const buildLegacyDbEnv = (readEnv: (key: string, fallback?: string) => string) => ({
    dbDriver: readEnv('DB_DRIVER', 'pg') as 'pg' | 'mysql',
    dbHost: readEnv('DB_HOST', '127.0.0.1'),
    dbPort: Number(readEnv('DB_PORT', readEnv('DB_DRIVER', 'pg') === 'mysql' ? '3306' : '5432')),
    dbUser: readEnv('DB_USER', 'postgres'),
    dbPassword: readEnv('DB_PASSWORD', 'postgres'),
    dbName: readEnv('DB_NAME', 'mono_repo'),
})
