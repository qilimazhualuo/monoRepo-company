import { createHttpClient } from 'wc-utils'
import type { MenuItem, OrgItem, PageResult, RoleItem, UserItem } from 'wc-utils'

const httpClient = createHttpClient({ baseUrl: '/api' })

export const fetchOrgTree = async () => {
    const result = await httpClient.get<OrgItem[]>('/system/orgs/tree')
    return result.data
}

export const createOrg = async (payload: Omit<OrgItem, 'id' | 'children'>) => {
    const result = await httpClient.post<{ id: number }>('/system/orgs', payload)
    return result.data
}

export const updateOrg = async (orgId: number, payload: Omit<OrgItem, 'id' | 'children'>) => {
    const result = await httpClient.put<boolean>(`/system/orgs/${orgId}`, payload)
    return result.data
}

export const deleteOrg = async (orgId: number) => {
    const result = await httpClient.delete<boolean>(`/system/orgs/${orgId}`)
    return result.data
}

export const fetchMenuTree = async () => {
    const result = await httpClient.get<MenuItem[]>('/system/menus/tree')
    return result.data
}

export const createMenu = async (payload: Omit<MenuItem, 'id' | 'children'>) => {
    const result = await httpClient.post<{ id: number }>('/system/menus', payload)
    return result.data
}

export const updateMenu = async (menuId: number, payload: Omit<MenuItem, 'id' | 'children'>) => {
    const result = await httpClient.put<boolean>(`/system/menus/${menuId}`, payload)
    return result.data
}

export const deleteMenu = async (menuId: number) => {
    const result = await httpClient.delete<boolean>(`/system/menus/${menuId}`)
    return result.data
}

export const fetchRoles = async () => {
    const result = await httpClient.get<RoleItem[]>('/system/roles')
    return result.data
}

export const createRole = async (payload: Omit<RoleItem, 'id'>) => {
    const result = await httpClient.post<{ id: number }>('/system/roles', payload)
    return result.data
}

export const updateRole = async (roleId: number, payload: Omit<RoleItem, 'id'>) => {
    const result = await httpClient.put<boolean>(`/system/roles/${roleId}`, payload)
    return result.data
}

export const deleteRole = async (roleId: number) => {
    const result = await httpClient.delete<boolean>(`/system/roles/${roleId}`)
    return result.data
}

export const fetchRoleMenuIds = async (roleId: number) => {
    const result = await httpClient.get<number[]>(`/system/roles/${roleId}/menus`)
    return result.data
}

export const updateRoleMenus = async (roleId: number, menuIds: number[]) => {
    const result = await httpClient.put<boolean>(`/system/roles/${roleId}/menus`, { menuIds })
    return result.data
}

export const fetchUsers = async (params: { page?: number; pageSize?: number; keyword?: string }) => {
    const searchParams = new URLSearchParams()
    if (params.page) searchParams.set('page', String(params.page))
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params.keyword) searchParams.set('keyword', params.keyword)
    const query = searchParams.toString()
    const result = await httpClient.get<PageResult<UserItem>>(`/system/users${query ? `?${query}` : ''}`)
    return result.data
}

export const createUser = async (payload: {
    username: string
    password: string
    nickname?: string | null
    orgId?: number | null
    phone?: string | null
    email?: string | null
    status?: number
    roleIds?: number[]
}) => {
    const result = await httpClient.post<{ id: number }>('/system/users', payload)
    return result.data
}

export const updateUser = async (userId: number, payload: {
    nickname?: string | null
    orgId?: number | null
    phone?: string | null
    email?: string | null
    status?: number
    password?: string
}) => {
    const result = await httpClient.put<boolean>(`/system/users/${userId}`, payload)
    return result.data
}

export const deleteUser = async (userId: number) => {
    const result = await httpClient.delete<boolean>(`/system/users/${userId}`)
    return result.data
}

export const fetchUserRoleIds = async (userId: number) => {
    const result = await httpClient.get<number[]>(`/system/users/${userId}/roles`)
    return result.data
}

export const updateUserRoles = async (userId: number, roleIds: number[]) => {
    const result = await httpClient.put<boolean>(`/system/users/${userId}/roles`, { roleIds })
    return result.data
}
