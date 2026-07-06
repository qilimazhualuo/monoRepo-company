import { getDbDriver, type DatabaseInstance } from '../db'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

export const isMysqlDriver = () => getDbDriver() === 'mysql'

export const asMysqlDb = (database: DatabaseInstance) => database as MySql2Database

export const asPgDb = (database: DatabaseInstance) => database as PostgresJsDatabase

export interface TreeNode<T> {
    id: number
    parentId: number
    children: TreeNode<T>[]
    data: T
}

export const buildTree = <T extends { id: number; parentId: number }>(
    items: T[],
    parentId = 0,
): TreeNode<T>[] => {
    return items
        .filter((item) => item.parentId === parentId)
        .sort((leftItem, rightItem) => {
            const leftSort = 'sortOrder' in leftItem ? Number(leftItem.sortOrder) : 0
            const rightSort = 'sortOrder' in rightItem ? Number(rightItem.sortOrder) : 0
            return leftSort - rightSort
        })
        .map((item) => ({
            id: item.id,
            parentId: item.parentId,
            data: item,
            children: buildTree(items, item.id),
        }))
}
