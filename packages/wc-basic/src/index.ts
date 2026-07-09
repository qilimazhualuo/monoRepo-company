export {
    basicRoutes,
    basicChildRoutes,
    basicNavList,
    createBasicRoutes,
} from './routes'
export type { CreateBasicRoutesOptions } from './routes'

export { default as OrgManage } from './views/OrgManage.vue'
export { default as UserManage } from './views/UserManage.vue'
export { default as RoleManage } from './views/RoleManage.vue'
export { default as MenuManage } from './views/MenuManage.vue'
export { default as DictTypeManage } from './views/DictTypeManage.vue'
export { default as DictDataManage } from './views/DictDataManage.vue'

export * from './api/system'
export * from './api/dict'
