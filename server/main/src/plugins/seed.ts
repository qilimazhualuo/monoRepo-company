import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { Elysia } from 'elysia'
import { env } from '../config/env'
import { getDb } from '../db'
import {
    getDictDataTable,
    getDictTypesTable,
    getMenusTable,
    getOrgsTable,
    getRoleMenusTable,
    getRolesTable,
    getUserRolesTable,
    getUsersTable,
    isMysqlDriver,
} from '../models'

const defaultMenus = [
    { parentKey: null, key: 'basic', name: '基础数据', type: 'dir', path: null, permission: null, sort: 2 },
    { parentKey: 'basic', key: 'dict-type', name: '字典类型', type: 'menu', path: '/basic/dict-type', permission: 'basic:dict-type:list', sort: 1 },
    { parentKey: 'basic', key: 'dict-data', name: '字典数据', type: 'menu', path: '/basic/dict-data', permission: 'basic:dict-data:list', sort: 2 },
    { parentKey: null, key: 'system', name: '系统管理', type: 'dir', path: null, permission: null, sort: 1 },
    { parentKey: 'system', key: 'org', name: '单位管理', type: 'menu', path: '/system/org', permission: 'system:org:list', sort: 1 },
    { parentKey: 'system', key: 'user', name: '人员管理', type: 'menu', path: '/system/user', permission: 'system:user:list', sort: 2 },
    { parentKey: 'system', key: 'role', name: '角色管理', type: 'menu', path: '/system/role', permission: 'system:role:list', sort: 3 },
    { parentKey: 'system', key: 'menu', name: '菜单管理', type: 'menu', path: '/system/menu', permission: 'system:menu:list', sort: 4 },
    { parentKey: null, key: 'sub-app', name: '子应用', type: 'dir', path: null, permission: null, sort: 3 },
    { parentKey: 'sub-app', key: 'sub-app-home', name: '子应用首页', type: 'menu', path: '/sub-app', permission: null, sort: 1 },
    { parentKey: 'sub-app', key: 'sub-app-about', name: '关于', type: 'menu', path: '/sub-app/about', permission: null, sort: 2 },
] as const

const defaultDictTypes = [
    { name: '系统状态', type: 'sys_normal_disable', remark: '通用启用停用' },
    { name: '用户性别', type: 'sys_user_sex', remark: '用户性别列表' },
] as const

const defaultDictData = [
    { dictType: 'sys_normal_disable', label: '正常', value: '1', sort: 1 },
    { dictType: 'sys_normal_disable', label: '停用', value: '0', sort: 2 },
    { dictType: 'sys_user_sex', label: '男', value: '0', sort: 1 },
    { dictType: 'sys_user_sex', label: '女', value: '1', sort: 2 },
    { dictType: 'sys_user_sex', label: '未知', value: '2', sort: 3 },
] as const

export const seedPlugin = new Elysia({ name: 'seed' })
    .onStart(async () => {
        const database = getDb()
        const usersTable = getUsersTable()
        const orgsTable = getOrgsTable()
        const rolesTable = getRolesTable()
        const menusTable = getMenusTable()
        const dictTypesTable = getDictTypesTable()
        const dictDataTable = getDictDataTable()
        const userRolesTable = getUserRolesTable()
        const roleMenusTable = getRoleMenusTable()

        const existingUsers = isMysqlDriver()
            ? await (database as MySql2Database)
                .select()
                .from(usersTable)
                .where(eq(usersTable.username, env.defaultAdminUsername))
                .limit(1)
            : await (database as PostgresJsDatabase)
                .select()
                .from(usersTable)
                .where(eq(usersTable.username, env.defaultAdminUsername))
                .limit(1)

        let adminUserId = existingUsers[0]?.id

        if (!adminUserId) {
            const passwordHash = await bcrypt.hash(env.defaultAdminPassword, 10)
            const insertResult = isMysqlDriver()
                ? await (database as MySql2Database).insert(usersTable).values({
                    username: env.defaultAdminUsername,
                    passwordHash,
                    nickname: '系统管理员',
                    status: 1,
                })
                : await (database as PostgresJsDatabase).insert(usersTable).values({
                    username: env.defaultAdminUsername,
                    passwordHash,
                    nickname: '系统管理员',
                    status: 1,
                }).returning()

            adminUserId = isMysqlDriver()
                ? Number((insertResult as { insertId: number }).insertId)
                : (insertResult as { id: number }[])[0]?.id

            console.log(`[seed] 已创建默认管理员: ${env.defaultAdminUsername}`)
        }

        const existingOrgs = isMysqlDriver()
            ? await (database as MySql2Database).select().from(orgsTable).limit(1)
            : await (database as PostgresJsDatabase).select().from(orgsTable).limit(1)

        let rootOrgId = existingOrgs[0]?.id
        if (!rootOrgId) {
            const orgInsertResult = isMysqlDriver()
                ? await (database as MySql2Database).insert(orgsTable).values({
                    parentId: null,
                    name: '总公司',
                    code: 'root',
                    sort: 0,
                    status: 1,
                })
                : await (database as PostgresJsDatabase).insert(orgsTable).values({
                    parentId: null,
                    name: '总公司',
                    code: 'root',
                    sort: 0,
                    status: 1,
                }).returning()

            rootOrgId = isMysqlDriver()
                ? Number((orgInsertResult as { insertId: number }).insertId)
                : (orgInsertResult as { id: number }[])[0]?.id
        }

        if (adminUserId && rootOrgId) {
            if (isMysqlDriver()) {
                await (database as MySql2Database)
                    .update(usersTable)
                    .set({ orgId: rootOrgId })
                    .where(eq(usersTable.id, adminUserId))
            } else {
                await (database as PostgresJsDatabase)
                    .update(usersTable)
                    .set({ orgId: rootOrgId })
                    .where(eq(usersTable.id, adminUserId))
            }
        }

        const existingRoles = isMysqlDriver()
            ? await (database as MySql2Database)
                .select()
                .from(rolesTable)
                .where(eq(rolesTable.code, 'admin'))
                .limit(1)
            : await (database as PostgresJsDatabase)
                .select()
                .from(rolesTable)
                .where(eq(rolesTable.code, 'admin'))
                .limit(1)

        let adminRoleId = existingRoles[0]?.id
        if (!adminRoleId) {
            const roleInsertResult = isMysqlDriver()
                ? await (database as MySql2Database).insert(rolesTable).values({
                    code: 'admin',
                    name: '超级管理员',
                    description: '拥有全部系统权限',
                    status: 1,
                })
                : await (database as PostgresJsDatabase).insert(rolesTable).values({
                    code: 'admin',
                    name: '超级管理员',
                    description: '拥有全部系统权限',
                    status: 1,
                }).returning()

            adminRoleId = isMysqlDriver()
                ? Number((roleInsertResult as { insertId: number }).insertId)
                : (roleInsertResult as { id: number }[])[0]?.id
        }

        const existingMenus = isMysqlDriver()
            ? await (database as MySql2Database).select().from(menusTable).limit(1)
            : await (database as PostgresJsDatabase).select().from(menusTable).limit(1)

        const menuIdMap = new Map<string, number>()

        if (existingMenus.length === 0) {
            for (const menuItem of defaultMenus) {
                const parentId = menuItem.parentKey ? menuIdMap.get(menuItem.parentKey) ?? null : null
                const insertResult = isMysqlDriver()
                    ? await (database as MySql2Database).insert(menusTable).values({
                        parentId,
                        name: menuItem.name,
                        type: menuItem.type,
                        path: menuItem.path,
                        permission: menuItem.permission,
                        sort: menuItem.sort,
                        status: 1,
                    })
                    : await (database as PostgresJsDatabase).insert(menusTable).values({
                        parentId,
                        name: menuItem.name,
                        type: menuItem.type,
                        path: menuItem.path,
                        permission: menuItem.permission,
                        sort: menuItem.sort,
                        status: 1,
                    }).returning()

                const menuId = isMysqlDriver()
                    ? Number((insertResult as { insertId: number }).insertId)
                    : (insertResult as { id: number }[])[0]?.id

                menuIdMap.set(menuItem.key, menuId)
            }
        } else {
            const allMenus = isMysqlDriver()
                ? await (database as MySql2Database).select().from(menusTable)
                : await (database as PostgresJsDatabase).select().from(menusTable)

            allMenus.forEach((menu) => {
                if (menu.path === '/basic/dict-type') menuIdMap.set('dict-type', menu.id)
                if (menu.path === '/basic/dict-data') menuIdMap.set('dict-data', menu.id)
                if (menu.path === '/system/org') menuIdMap.set('org', menu.id)
                if (menu.path === '/system/user') menuIdMap.set('user', menu.id)
                if (menu.path === '/system/role') menuIdMap.set('role', menu.id)
                if (menu.path === '/system/menu') menuIdMap.set('menu', menu.id)
                if (menu.path === '/sub-app') menuIdMap.set('sub-app-home', menu.id)
                if (menu.path === '/sub-app/about') menuIdMap.set('sub-app-about', menu.id)
            })
        }

        const existingDictTypes = isMysqlDriver()
            ? await (database as MySql2Database).select().from(dictTypesTable).limit(1)
            : await (database as PostgresJsDatabase).select().from(dictTypesTable).limit(1)

        if (existingDictTypes.length === 0) {
            for (const dictTypeItem of defaultDictTypes) {
                if (isMysqlDriver()) {
                    await (database as MySql2Database).insert(dictTypesTable).values({
                        name: dictTypeItem.name,
                        type: dictTypeItem.type,
                        status: 1,
                        remark: dictTypeItem.remark,
                    })
                } else {
                    await (database as PostgresJsDatabase).insert(dictTypesTable).values({
                        name: dictTypeItem.name,
                        type: dictTypeItem.type,
                        status: 1,
                        remark: dictTypeItem.remark,
                    })
                }
            }

            for (const dictDataItem of defaultDictData) {
                if (isMysqlDriver()) {
                    await (database as MySql2Database).insert(dictDataTable).values({
                        dictType: dictDataItem.dictType,
                        label: dictDataItem.label,
                        value: dictDataItem.value,
                        sort: dictDataItem.sort,
                        status: 1,
                        remark: null,
                    })
                } else {
                    await (database as PostgresJsDatabase).insert(dictDataTable).values({
                        dictType: dictDataItem.dictType,
                        label: dictDataItem.label,
                        value: dictDataItem.value,
                        sort: dictDataItem.sort,
                        status: 1,
                        remark: null,
                    })
                }
            }
        }

        if (adminUserId && adminRoleId) {
            const existingUserRole = isMysqlDriver()
                ? await (database as MySql2Database)
                    .select()
                    .from(userRolesTable)
                    .where(eq(userRolesTable.userId, adminUserId))
                    .limit(1)
                : await (database as PostgresJsDatabase)
                    .select()
                    .from(userRolesTable)
                    .where(eq(userRolesTable.userId, adminUserId))
                    .limit(1)

            if (existingUserRole.length === 0) {
                if (isMysqlDriver()) {
                    await (database as MySql2Database).insert(userRolesTable).values({
                        userId: adminUserId,
                        roleId: adminRoleId,
                    })
                } else {
                    await (database as PostgresJsDatabase).insert(userRolesTable).values({
                        userId: adminUserId,
                        roleId: adminRoleId,
                    })
                }
            }
        }

        if (adminRoleId) {
            const allMenuRows = isMysqlDriver()
                ? await (database as MySql2Database).select().from(menusTable)
                : await (database as PostgresJsDatabase).select().from(menusTable)

            const existingRoleMenus = isMysqlDriver()
                ? await (database as MySql2Database)
                    .select()
                    .from(roleMenusTable)
                    .where(eq(roleMenusTable.roleId, adminRoleId))
                    .limit(1)
                : await (database as PostgresJsDatabase)
                    .select()
                    .from(roleMenusTable)
                    .where(eq(roleMenusTable.roleId, adminRoleId))
                    .limit(1)

            if (existingRoleMenus.length === 0 && allMenuRows.length > 0) {
                const roleMenuValues = allMenuRows.map((menu) => ({
                    roleId: adminRoleId as number,
                    menuId: menu.id,
                }))

                if (isMysqlDriver()) {
                    await (database as MySql2Database).insert(roleMenusTable).values(roleMenuValues)
                } else {
                    await (database as PostgresJsDatabase).insert(roleMenusTable).values(roleMenuValues)
                }
            }
        }

        console.log('[seed] 系统基础数据已就绪')
    })
