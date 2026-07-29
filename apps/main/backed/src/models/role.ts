import { int, mysqlTable, serial, text, timestamp, varchar } from 'drizzle-orm/mysql-core'
import { integer, pgTable, serial as pgSerial, text as pgText, timestamp as pgTimestamp, varchar as pgVarchar } from 'drizzle-orm/pg-core'

export const rolesPg = pgTable('roles', {
    id: pgSerial('id').primaryKey(),
    code: pgVarchar('code', { length: 64 }).notNull().unique(),
    name: pgVarchar('name', { length: 64 }).notNull(),
    description: pgText('description'),
    status: integer('status').notNull().default(1),
    createdAt: pgTimestamp('created_at').defaultNow().notNull(),
})

export const rolesMysql = mysqlTable('roles', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 64 }).notNull().unique(),
    name: varchar('name', { length: 64 }).notNull(),
    description: text('description'),
    status: int('status').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const roleMenusPg = pgTable('role_menus', {
    roleId: integer('role_id').notNull(),
    menuId: integer('menu_id').notNull(),
})

export const roleMenusMysql = mysqlTable('role_menus', {
    roleId: int('role_id').notNull(),
    menuId: int('menu_id').notNull(),
})

export type RoleRecord = {
    id: number
    code: string
    name: string
    description: string | null
    status: number
    createdAt: Date
}
