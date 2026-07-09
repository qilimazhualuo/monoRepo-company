import { int, mysqlTable, serial, timestamp, varchar } from 'drizzle-orm/mysql-core'
import { integer, pgTable, serial as pgSerial, timestamp as pgTimestamp, varchar as pgVarchar } from 'drizzle-orm/pg-core'

export const menusPg = pgTable('menus', {
    id: pgSerial('id').primaryKey(),
    parentId: integer('parent_id'),
    name: pgVarchar('name', { length: 64 }).notNull(),
    type: pgVarchar('type', { length: 16 }).notNull().default('menu'),
    path: pgVarchar('path', { length: 255 }),
    permission: pgVarchar('permission', { length: 128 }),
    icon: pgVarchar('icon', { length: 64 }),
    sort: integer('sort').notNull().default(0),
    status: integer('status').notNull().default(1),
    createdAt: pgTimestamp('created_at').defaultNow().notNull(),
})

export const menusMysql = mysqlTable('menus', {
    id: serial('id').primaryKey(),
    parentId: int('parent_id'),
    name: varchar('name', { length: 64 }).notNull(),
    type: varchar('type', { length: 16 }).notNull().default('menu'),
    path: varchar('path', { length: 255 }),
    permission: varchar('permission', { length: 128 }),
    icon: varchar('icon', { length: 64 }),
    sort: int('sort').notNull().default(0),
    status: int('status').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type MenuRecord = {
    id: number
    parentId: number | null
    name: string
    type: string
    path: string | null
    permission: string | null
    icon: string | null
    sort: number
    status: number
    createdAt: Date
}
