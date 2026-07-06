import type { NacosBootstrapConfig } from './types'

const DATASOURCE_EXCLUDED_SERVICES = new Set(['gateway', 'basic'])

export const listNacosServiceNames = async (bootstrapConfig: NacosBootstrapConfig) => {
    if (!bootstrapConfig.enabled) {
        return []
    }

    const listUrl = new URL(`http://${bootstrapConfig.serverAddr}/nacos/v1/ns/service/list`)
    listUrl.searchParams.set('groupName', bootstrapConfig.group)
    listUrl.searchParams.set('pageNo', '1')
    listUrl.searchParams.set('pageSize', '200')

    const credentials = Buffer.from(`${bootstrapConfig.username}:${bootstrapConfig.password}`).toString('base64')
    const response = await fetch(listUrl, {
        headers: {
            Authorization: `Basic ${credentials}`,
        },
    })

    if (!response.ok) {
        throw new Error(`[nacos] 获取服务列表失败: HTTP ${response.status}`)
    }

    const result = await response.json() as {
        count?: number
        doms?: string[]
    }

    return (result.doms ?? [])
        .filter((serviceName) => !DATASOURCE_EXCLUDED_SERVICES.has(serviceName))
}
