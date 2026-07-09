import { int, mysqlTable, serial, timestamp, varchar } from 'drizzle-orm/mysql-core'
import { integer, pgTable, serial as pgSerial, timestamp as pgTimestamp, varchar as pgVarchar } from 'drizzle-orm/pg-core'

export const orgsPg = pgTable('organizations', {
    id: pgSerial('id').primaryKey(),
    parentId: integer('parent_id'),
    name: pgVarchar('name', { length: 128 }).notNull(),
    code: pgVarchar('code', { length: 64 }).notNull().unique(),
    sort: integer('sort').notNull().default(0),
    status: integer('status').notNull().default(1),
    createdAt: pgTimestamp('created_at').defaultNow().notNull(),
})

export const orgsMysql = mysqlTable('organizations', {
    id: serial('id').primaryKey(),
    parentId: int('parent_id'),
    name: varchar('name', { length: 128 }).notNull(),
    code: varchar('code', { length: 64 }).notNull().unique(),
    sort: int('sort').notNull().default(0),
    status: int('status').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type OrgRecord = {
    id: number
    parentId: number | null
    name: string
    code: string
    sort: number
    status: number
    createdAt: Date
}
