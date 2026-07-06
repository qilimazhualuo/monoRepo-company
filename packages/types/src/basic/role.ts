import { mysqlTable, serial, varchar, int, smallint, timestamp, primaryKey } from 'drizzle-orm/mysql-core'
import {
    pgTable,
    serial as pgSerial,
    varchar as pgVarchar,
    integer,
    smallint as pgSmallint,
    timestamp as pgTimestamp,
    primaryKey as pgPrimaryKey,
} from 'drizzle-orm/pg-core'

export const rolesPg = pgTable('sys_role', {
    id: pgSerial('id').primaryKey(),
    systemId: integer('system_id'),
    code: pgVarchar('code', { length: 64 }).notNull(),
    name: pgVarchar('name', { length: 128 }).notNull(),
    description: pgVarchar('description', { length: 512 }),
    status: pgSmallint('status').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: pgTimestamp('created_at').defaultNow().notNull(),
    updatedAt: pgTimestamp('updated_at').defaultNow().notNull(),
})

export const rolesMysql = mysqlTable('sys_role', {
    id: serial('id').primaryKey(),
    systemId: int('system_id'),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    description: varchar('description', { length: 512 }),
    status: smallint('status').notNull().default(1),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const roleMenusPg = pgTable('sys_role_menu', {
    roleId: integer('role_id').notNull(),
    menuId: integer('menu_id').notNull(),
}, (table) => ({
    pk: pgPrimaryKey({ columns: [table.roleId, table.menuId] }),
}))

export const roleMenusMysql = mysqlTable('sys_role_menu', {
    roleId: int('role_id').notNull(),
    menuId: int('menu_id').notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.menuId] }),
}))

export const personnelRolesPg = pgTable('sys_personnel_role', {
    personnelId: integer('personnel_id').notNull(),
    roleId: integer('role_id').notNull(),
}, (table) => ({
    pk: pgPrimaryKey({ columns: [table.personnelId, table.roleId] }),
}))

export const personnelRolesMysql = mysqlTable('sys_personnel_role', {
    personnelId: int('personnel_id').notNull(),
    roleId: int('role_id').notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.personnelId, table.roleId] }),
}))

export type RoleRecord = {
    id: number
    systemId: number | null
    code: string
    name: string
    description: string | null
    status: number
    sortOrder: number
    createdAt: Date
    updatedAt: Date
}
