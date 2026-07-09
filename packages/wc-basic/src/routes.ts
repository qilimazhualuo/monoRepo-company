import type { RouteRecordRaw } from 'vue-router'

type BasicRouteItem = {
    path: string
    name: string
    title: string
    component: () => Promise<unknown>
}

const basicRouteItems: BasicRouteItem[] = [
    {
        path: 'basic/dict-type',
        name: 'basic-dict-type',
        title: '字典类型',
        component: () => import('./views/DictTypeManage.vue'),
    },
    {
        path: 'basic/dict-data',
        name: 'basic-dict-data',
        title: '字典数据',
        component: () => import('./views/DictDataManage.vue'),
    },
    {
        path: 'system/org',
        name: 'system-org',
        title: '单位管理',
        component: () => import('./views/OrgManage.vue'),
    },
    {
        path: 'system/user',
        name: 'system-user',
        title: '人员管理',
        component: () => import('./views/UserManage.vue'),
    },
    {
        path: 'system/role',
        name: 'system-role',
        title: '角色管理',
        component: () => import('./views/RoleManage.vue'),
    },
    {
        path: 'system/menu',
        name: 'system-menu',
        title: '菜单管理',
        component: () => import('./views/MenuManage.vue'),
    },
]

export type CreateBasicRoutesOptions = {
    absolute?: boolean
    requiresAuth?: boolean
}

export const createBasicRoutes = (options: CreateBasicRoutesOptions = {}): RouteRecordRaw[] => {
    const absolute = options.absolute ?? true
    const requiresAuth = options.requiresAuth ?? true

    return basicRouteItems.map((routeItem) => ({
        path: absolute ? `/${routeItem.path}` : routeItem.path,
        name: routeItem.name,
        component: routeItem.component,
        meta: {
            title: routeItem.title,
            requiresAuth,
        },
    }))
}

export const basicRoutes = createBasicRoutes()
export const basicChildRoutes = createBasicRoutes({ absolute: false })

export const basicNavList = basicRouteItems.map((routeItem) => ({
    path: `/${routeItem.path}`,
    name: routeItem.name,
    label: routeItem.title,
}))
