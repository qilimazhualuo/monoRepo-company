import { mysqlTable, serial, varchar, int, smallint, timestamp } from 'drizzle-orm/mysql-core'
import {
    pgTable,
    serial as pgSerial,
    varchar as pgVarchar,
    integer,
    smallint as pgSmallint,
    timestamp as pgTimestamp,
} from 'drizzle-orm/pg-core'

export const unitsPg = pgTable('sys_unit', {
    id: pgSerial('id').primaryKey(),
    parentId: integer('parent_id').notNull().default(0),
    systemId: integer('system_id'),
    code: pgVarchar('code', { length: 64 }).notNull(),
    name: pgVarchar('name', { length: 128 }).notNull(),
    unitType: pgVarchar('unit_type', { length: 32 }),
    leader: pgVarchar('leader', { length: 64 }),
    phone: pgVarchar('phone', { length: 32 }),
    status: pgSmallint('status').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: pgTimestamp('created_at').defaultNow().notNull(),
    updatedAt: pgTimestamp('updated_at').defaultNow().notNull(),
})

export const unitsMysql = mysqlTable('sys_unit', {
    id: serial('id').primaryKey(),
    parentId: int('parent_id').notNull().default(0),
    systemId: int('system_id'),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    unitType: varchar('unit_type', { length: 32 }),
    leader: varchar('leader', { length: 64 }),
    phone: varchar('phone', { length: 32 }),
    status: smallint('status').notNull().default(1),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type UnitRecord = {
    id: number
    parentId: number
    systemId: number | null
    code: string
    name: string
    unitType: string | null
    leader: string | null
    phone: string | null
    status: number
    sortOrder: number
    createdAt: Date
    updatedAt: Date
}
