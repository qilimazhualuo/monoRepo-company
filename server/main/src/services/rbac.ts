import { eq, inArray } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { env } from '../config/env'
import type { DatabaseInstance } from '../db'
import {
    getMenusTable,
    getRoleMenusTable,
    getRolesTable,
    getUserRolesTable,
    getUsersTable,
    isMysqlDriver,
} from '../models'
import type { MenuRecord } from '../models/menu'
import { buildTree } from '../utils/tree'

const isSuperAdmin = async (database: DatabaseInstance, userId: number) => {
    const usersTable = getUsersTable()
    const rows = isMysqlDriver()
        ? await (database as MySql2Database)
            .select({ username: usersTable.username })
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1)
        : await (database as PostgresJsDatabase)
            .select({ username: usersTable.username })
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1)

    return rows[0]?.username === env.defaultAdminUsername
}

const toMenuTreeNode = (menu: MenuRecord) => ({
    id: menu.id,
    parentId: menu.parentId,
    name: menu.name,
    type: menu.type,
    path: menu.path,
    permission: menu.permission,
    icon: menu.icon,
    sort: menu.sort,
    status: menu.status,
})

const getActiveMenus = async (database: DatabaseInstance) => {
    const menusTable = getMenusTable()
    const allMenus = isMysqlDriver()
        ? await (database as MySql2Database).select().from(menusTable)
        : await (database as PostgresJsDatabase).select().from(menusTable)

    return (allMenus as MenuRecord[]).filter((menu) => menu.status === 1)
}

export const getUserRoleIds = async (database: DatabaseInstance, userId: number) => {
    const userRolesTable = getUserRolesTable()
    const rows = isMysqlDriver()
        ? await (database as MySql2Database)
            .select()
            .from(userRolesTable)
            .where(eq(userRolesTable.userId, userId))
        : await (database as PostgresJsDatabase)
            .select()
            .from(userRolesTable)
            .where(eq(userRolesTable.userId, userId))

    return rows.map((row) => row.roleId)
}

export const getRoleMenuIds = async (database: DatabaseInstance, roleId: number) => {
    const roleMenusTable = getRoleMenusTable()
    const rows = isMysqlDriver()
        ? await (database as MySql2Database)
            .select()
            .from(roleMenusTable)
            .where(eq(roleMenusTable.roleId, roleId))
        : await (database as PostgresJsDatabase)
            .select()
            .from(roleMenusTable)
            .where(eq(roleMenusTable.roleId, roleId))

    return rows.map((row) => row.menuId)
}

export const getUserMenuIds = async (database: DatabaseInstance, userId: number) => {
    const roleIds = await getUserRoleIds(database, userId)
    if (roleIds.length === 0) {
        return []
    }

    const roleMenusTable = getRoleMenusTable()
    const rows = isMysqlDriver()
        ? await (database as MySql2Database)
            .select()
            .from(roleMenusTable)
            .where(inArray(roleMenusTable.roleId, roleIds))
        : await (database as PostgresJsDatabase)
            .select()
            .from(roleMenusTable)
            .where(inArray(roleMenusTable.roleId, roleIds))

    return [...new Set(rows.map((row) => row.menuId))]
}

export const getUserMenus = async (database: DatabaseInstance, userId: number) => {
    const activeMenus = await getActiveMenus(database)

    if (await isSuperAdmin(database, userId)) {
        return buildTree(
            activeMenus
                .filter((menu) => menu.type !== 'button')
                .map(toMenuTreeNode),
        )
    }

    const menuIds = await getUserMenuIds(database, userId)
    if (menuIds.length === 0) {
        return []
    }

    const allowedMenus = activeMenus.filter((menu) => menuIds.includes(menu.id))
    const parentIds = new Set<number>()
    const menuMap = new Map(activeMenus.map((menu) => [menu.id, menu]))

    allowedMenus.forEach((menu) => {
        let parentId = menu.parentId
        while (parentId) {
            parentIds.add(parentId)
            parentId = menuMap.get(parentId)?.parentId ?? null
        }
    })

    const visibleMenus = activeMenus.filter(
        (menu) => menuIds.includes(menu.id) || parentIds.has(menu.id),
    )

    return buildTree(
        visibleMenus
            .filter((menu) => menu.type !== 'button')
            .map(toMenuTreeNode),
    )
}

export const getUserPermissions = async (database: DatabaseInstance, userId: number) => {
    if (await isSuperAdmin(database, userId)) {
        const activeMenus = await getActiveMenus(database)
        return activeMenus
            .filter((menu) => menu.permission)
            .map((menu) => menu.permission as string)
    }

    const menuIds = await getUserMenuIds(database, userId)
    if (menuIds.length === 0) {
        return []
    }

    const activeMenus = await getActiveMenus(database)

    return activeMenus
        .filter((menu) => menuIds.includes(menu.id) && menu.permission)
        .map((menu) => menu.permission as string)
}

export const getRolesByUserId = async (database: DatabaseInstance, userId: number) => {
    const roleIds = await getUserRoleIds(database, userId)
    if (roleIds.length === 0) {
        return []
    }

    const rolesTable = getRolesTable()
    const rows = isMysqlDriver()
        ? await (database as MySql2Database)
            .select()
            .from(rolesTable)
            .where(inArray(rolesTable.id, roleIds))
        : await (database as PostgresJsDatabase)
            .select()
            .from(rolesTable)
            .where(inArray(rolesTable.id, roleIds))

    return rows
}
