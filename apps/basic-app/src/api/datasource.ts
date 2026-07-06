import { createHttpClient } from 'wc-utils'

export type DataSourceDriver = 'pg' | 'mysql'

export interface DataSourceSummary {
    id: string
    name: string
    driver: DataSourceDriver
    host: string
    port: number
    database: string
    isDefault: boolean
    isActive: boolean
}

export interface DataSourceDetail extends DataSourceSummary {
    user: string
    password: string
}

export interface DataSourceFormItem {
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

export interface DataSourceHealth {
    id: string
    name: string
    driver: string
    ok: boolean
    latencyMs: number
    message?: string
}

export interface TestConnectionResult {
    ok: boolean
    latencyMs: number
}

const httpClient = createHttpClient({ baseUrl: '/api' })

export const fetchDataSources = async () => {
    const result = await httpClient.get<DataSourceSummary[]>('/basic/datasources')
    return result.data
}

export const fetchCurrentDataSource = async () => {
    const result = await httpClient.get<DataSourceDetail>('/basic/datasources/current')
    return result.data
}

export const fetchDataSourceDetail = async (sourceId: string) => {
    const result = await httpClient.get<DataSourceDetail>(`/basic/datasources/${sourceId}`)
    return result.data
}

export const switchDataSource = async (sourceId: string) => {
    const result = await httpClient.post<DataSourceSummary[]>('/basic/datasources/switch', { sourceId })
    return result.data
}

export const reloadDataSources = async (sources: DataSourceFormItem[], defaultSourceId?: string) => {
    const result = await httpClient.post<DataSourceSummary[]>('/basic/datasources/reload', {
        sources,
        defaultSourceId,
    })
    return result.data
}

export const testDataSourceConnection = async (config: DataSourceFormItem) => {
    const result = await httpClient.post<TestConnectionResult>('/basic/datasources/test', config)
    return result.data
}

export const fetchDataSourcesHealth = async () => {
    const result = await httpClient.get<DataSourceHealth[]>('/basic/datasources-health')
    return result.data
}
