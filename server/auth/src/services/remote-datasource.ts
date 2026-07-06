import {
    applyDataSourceConfigs,
    buildServiceDatasourceChannel,
    getActiveDriver,
    getDataSourceManager,
    parseServiceDatasourceEvent,
    type DataSourceConfig,
} from 'data-kit'
import { getRedis } from 'auth-kit'
import { initModuleTables } from 'types'
import { env } from '../config/env'

const sleep = (delayMs: number) => new Promise((resolve) => {
    setTimeout(resolve, delayMs)
})

const runAuthMigrations = async () => {
    const manager = getDataSourceManager()
    await initModuleTables(
        (sqlText) => manager.executeSql(undefined, sqlText),
        'auth',
        getActiveDriver(),
    )
}

export const applyRemoteDatasource = async (
    sources: DataSourceConfig[],
    defaultSourceId?: string,
) => {
    await applyDataSourceConfigs(sources, defaultSourceId, { autoCreateDb: false })
    await runAuthMigrations()
}

const fetchRemoteDatasourcePayload = async () => {
    const requestUrl = `${env.basicServiceUrl}/api/basic/internal/service-datasources/${env.serviceId}`
    const maxRetryCount = 30
    const retryDelayMs = 1000

    for (let attemptIndex = 0; attemptIndex < maxRetryCount; attemptIndex += 1) {
        try {
            const response = await fetch(requestUrl, {
                headers: {
                    'x-internal-secret': env.internalApiSecret,
                },
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            const result = await response.json() as {
                code: string
                data: {
                    sources: DataSourceConfig[]
                    defaultSourceId: string
                }
            }

            if (result.code !== '200') {
                throw new Error(String(result.data))
            }

            return result.data
        } catch (error) {
            if (attemptIndex === maxRetryCount - 1) {
                throw new Error(`[auth] 无法从 basic 拉取数据源: ${String(error)}`)
            }

            console.warn(`[auth] 等待 basic 数据源就绪 (${attemptIndex + 1}/${maxRetryCount})...`)
            await sleep(retryDelayMs)
        }
    }

    throw new Error('[auth] 无法从 basic 拉取数据源')
}

export const bootstrapRemoteDatasource = async () => {
    const payload = await fetchRemoteDatasourcePayload()
    await applyRemoteDatasource(payload.sources, payload.defaultSourceId)
    console.log(`[auth] 已应用 basic 分配的数据源: ${payload.defaultSourceId}`)
}

export const startRemoteDatasourceListener = (redis: ReturnType<typeof getRedis>) => {
    const subscriber = redis.duplicate()
    const channel = buildServiceDatasourceChannel(env.datasourceNotifyPrefix)

    subscriber.subscribe(channel)
    subscriber.on('message', async (messageChannel, messageText) => {
        if (messageChannel !== channel) {
            return
        }

        try {
            const event = parseServiceDatasourceEvent(messageText)

            if (event.serviceId !== env.serviceId) {
                return
            }

            await applyRemoteDatasource(event.sources, event.defaultSourceId)
            console.log(`[auth] 收到后台通知，已切换数据源: ${event.defaultSourceId}`)
        } catch (error) {
            console.error('[auth] 处理数据源通知失败:', error)
        }
    })

    console.log('[auth] 已订阅 basic 数据源变更通知')
    return subscriber
}
