export type DataSourceDriver = 'pg' | 'mysql'

export interface DataSourceConfig {
    id: string
    name: string
    driver: DataSourceDriver
    host: string
    port: number
    user: string
    password: string
    database: string
    isDefault?: boolean
}

export interface DataSourceRuntime {
    config: DataSourceConfig
    drizzle: unknown
    driver: DataSourceDriver
}

export interface QueryRequest {
    sql: string
    params?: unknown[]
}

export interface QueryResult {
    rows: Record<string, unknown>[]
    rowCount: number
    fields?: string[]
}

export interface DataSourceHealth {
    id: string
    name: string
    driver: DataSourceDriver
    ok: boolean
    latencyMs: number
    message?: string
}

export interface LegacyDbEnv {
    dbDriver: DataSourceDriver
    dbHost: string
    dbPort: number
    dbUser: string
    dbPassword: string
    dbName: string
}
