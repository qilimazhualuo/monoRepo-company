import { mysqlTable, serial, varchar, int, smallint, timestamp } from 'drizzle-orm/mysql-core'
import {
    pgTable,
    serial as pgSerial,
    varchar as pgVarchar,
    integer,
    smallint as pgSmallint,
    timestamp as pgTimestamp,
} from 'drizzle-orm/pg-core'

export const systemsPg = pgTable('sys_system', {
    id: pgSerial('id').primaryKey(),
    code: pgVarchar('code', { length: 64 }).notNull().unique(),
    name: pgVarchar('name', { length: 128 }).notNull(),
    description: pgVarchar('description', { length: 512 }),
    status: pgSmallint('status').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: pgTimestamp('created_at').defaultNow().notNull(),
    updatedAt: pgTimestamp('updated_at').defaultNow().notNull(),
})

export const systemsMysql = mysqlTable('sys_system', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 64 }).notNull().unique(),
    name: varchar('name', { length: 128 }).notNull(),
    description: varchar('description', { length: 512 }),
    status: smallint('status').notNull().default(1),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type SystemRecord = {
    id: number
    code: string
    name: string
    description: string | null
    status: number
    sortOrder: number
    createdAt: Date
    updatedAt: Date
}
