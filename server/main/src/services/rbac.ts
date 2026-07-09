import { eq, inArray } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { DatabaseInstance } from '../db'
import {
    getMenusTable,
    getRoleMenusTable,
    getRolesTable,
    getUserRolesTable,
    isMysqlDriver,
} from '../models'
import type { MenuRecord } from '../models/menu'
import { buildTree } from '../utils/tree'

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
    const menuIds = await getUserMenuIds(database, userId)
    const menusTable = getMenusTable()
    const allMenus = isMysqlDriver()
        ? await (database as MySql2Database).select().from(menusTable)
        : await (database as PostgresJsDatabase).select().from(menusTable)

    const activeMenus = (allMenus as MenuRecord[]).filter((menu) => menu.status === 1)
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
            .map((menu) => ({
                id: menu.id,
                parentId: menu.parentId,
                name: menu.name,
                type: menu.type,
                path: menu.path,
                permission: menu.permission,
                icon: menu.icon,
                sort: menu.sort,
                status: menu.status,
            })),
    )
}

export const getUserPermissions = async (database: DatabaseInstance, userId: number) => {
    const menuIds = await getUserMenuIds(database, userId)
    if (menuIds.length === 0) {
        return []
    }

    const menusTable = getMenusTable()
    const allMenus = isMysqlDriver()
        ? await (database as MySql2Database).select().from(menusTable)
        : await (database as PostgresJsDatabase).select().from(menusTable)

    return (allMenus as MenuRecord[])
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
