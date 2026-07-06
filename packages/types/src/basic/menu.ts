import { mysqlTable, serial, varchar, int, smallint, timestamp } from 'drizzle-orm/mysql-core'
import {
    pgTable,
    serial as pgSerial,
    varchar as pgVarchar,
    integer,
    smallint as pgSmallint,
    timestamp as pgTimestamp,
} from 'drizzle-orm/pg-core'

export const menusPg = pgTable('sys_menu', {
    id: pgSerial('id').primaryKey(),
    parentId: integer('parent_id').notNull().default(0),
    systemId: integer('system_id'),
    name: pgVarchar('name', { length: 128 }).notNull(),
    path: pgVarchar('path', { length: 256 }),
    component: pgVarchar('component', { length: 256 }),
    icon: pgVarchar('icon', { length: 64 }),
    menuType: pgVarchar('menu_type', { length: 16 }).notNull().default('menu'),
    permission: pgVarchar('permission', { length: 128 }),
    status: pgSmallint('status').notNull().default(1),
    visible: pgSmallint('visible').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: pgTimestamp('created_at').defaultNow().notNull(),
    updatedAt: pgTimestamp('updated_at').defaultNow().notNull(),
})

export const menusMysql = mysqlTable('sys_menu', {
    id: serial('id').primaryKey(),
    parentId: int('parent_id').notNull().default(0),
    systemId: int('system_id'),
    name: varchar('name', { length: 128 }).notNull(),
    path: varchar('path', { length: 256 }),
    component: varchar('component', { length: 256 }),
    icon: varchar('icon', { length: 64 }),
    menuType: varchar('menu_type', { length: 16 }).notNull().default('menu'),
    permission: varchar('permission', { length: 128 }),
    status: smallint('status').notNull().default(1),
    visible: smallint('visible').notNull().default(1),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type MenuRecord = {
    id: number
    parentId: number
    systemId: number | null
    name: string
    path: string | null
    component: string | null
    icon: string | null
    menuType: string
    permission: string | null
    status: number
    visible: number
    sortOrder: number
    createdAt: Date
    updatedAt: Date
}
