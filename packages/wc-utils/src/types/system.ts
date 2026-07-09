export interface OrgItem {
    id: number
    parentId: number | null
    name: string
    code: string
    sort: number
    status: number
    children?: OrgItem[]
}

export interface MenuItem {
    id: number
    parentId: number | null
    name: string
    type: string
    path: string | null
    permission: string | null
    icon: string | null
    sort: number
    status: number
    children?: MenuItem[]
}

export interface RoleItem {
    id: number
    code: string
    name: string
    description: string | null
    status: number
}

export interface UserItem {
    id: number
    username: string
    nickname: string | null
    orgId: number | null
    orgName?: string | null
    phone: string | null
    email: string | null
    status: number
    roleNames?: string[]
    createdAt?: string | Date
}

export interface PageResult<T> {
    list: T[]
    total: number
    page: number
    pageSize: number
}
