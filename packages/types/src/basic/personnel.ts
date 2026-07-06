import { mysqlTable, serial, varchar, int, smallint, timestamp } from 'drizzle-orm/mysql-core'
import {
    pgTable,
    serial as pgSerial,
    varchar as pgVarchar,
    integer,
    smallint as pgSmallint,
    timestamp as pgTimestamp,
} from 'drizzle-orm/pg-core'

export const personnelPg = pgTable('sys_personnel', {
    id: pgSerial('id').primaryKey(),
    unitId: integer('unit_id'),
    account: pgVarchar('account', { length: 64 }),
    name: pgVarchar('name', { length: 64 }).notNull(),
    phone: pgVarchar('phone', { length: 32 }),
    email: pgVarchar('email', { length: 128 }),
    gender: pgSmallint('gender').default(0),
    status: pgSmallint('status').notNull().default(1),
    remark: pgVarchar('remark', { length: 512 }),
    createdAt: pgTimestamp('created_at').defaultNow().notNull(),
    updatedAt: pgTimestamp('updated_at').defaultNow().notNull(),
})

export const personnelMysql = mysqlTable('sys_personnel', {
    id: serial('id').primaryKey(),
    unitId: int('unit_id'),
    account: varchar('account', { length: 64 }),
    name: varchar('name', { length: 64 }).notNull(),
    phone: varchar('phone', { length: 32 }),
    email: varchar('email', { length: 128 }),
    gender: smallint('gender').default(0),
    status: smallint('status').notNull().default(1),
    remark: varchar('remark', { length: 512 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type PersonnelRecord = {
    id: number
    unitId: number | null
    account: string | null
    name: string
    phone: string | null
    email: string | null
    gender: number | null
    status: number
    remark: string | null
    createdAt: Date
    updatedAt: Date
}
