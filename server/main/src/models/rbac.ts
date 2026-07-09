import { int, mysqlTable, primaryKey } from 'drizzle-orm/mysql-core'
import { integer, pgTable, primaryKey as pgPrimaryKey } from 'drizzle-orm/pg-core'

export const userRolesPg = pgTable('user_roles', {
    userId: integer('user_id').notNull(),
    roleId: integer('role_id').notNull(),
}, (table) => ({
    pk: pgPrimaryKey({ columns: [table.userId, table.roleId] }),
}))

export const userRolesMysql = mysqlTable('user_roles', {
    userId: int('user_id').notNull(),
    roleId: int('role_id').notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
}))
