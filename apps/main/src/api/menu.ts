import { createHttpClient } from 'wc-utils'
import type { MenuItem } from 'wc-utils'

const httpClient = createHttpClient({ baseUrl: '/api' })

export const fetchUserMenus = async () => {
    const result = await httpClient.get<MenuItem[]>('/auth/menus')
    return result.data
}
