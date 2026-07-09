import { int, mysqlTable, serial, timestamp, varchar } from 'drizzle-orm/mysql-core'
import { integer, pgTable, serial as pgSerial, timestamp as pgTimestamp, varchar as pgVarchar, text as pgText } from 'drizzle-orm/pg-core'

export const dictTypesPg = pgTable('dict_types', {
    id: pgSerial('id').primaryKey(),
    name: pgVarchar('name', { length: 64 }).notNull(),
    type: pgVarchar('type', { length: 64 }).notNull().unique(),
    status: integer('status').notNull().default(1),
    remark: pgText('remark'),
    createdAt: pgTimestamp('created_at').defaultNow().notNull(),
})

export const dictTypesMysql = mysqlTable('dict_types', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 64 }).notNull(),
    type: varchar('type', { length: 64 }).notNull().unique(),
    status: int('status').notNull().default(1),
    remark: varchar('remark', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const dictDataPg = pgTable('dict_data', {
    id: pgSerial('id').primaryKey(),
    dictType: pgVarchar('dict_type', { length: 64 }).notNull(),
    label: pgVarchar('label', { length: 128 }).notNull(),
    value: pgVarchar('value', { length: 128 }).notNull(),
    sort: integer('sort').notNull().default(0),
    status: integer('status').notNull().default(1),
    remark: pgText('remark'),
    createdAt: pgTimestamp('created_at').defaultNow().notNull(),
})

export const dictDataMysql = mysqlTable('dict_data', {
    id: serial('id').primaryKey(),
    dictType: varchar('dict_type', { length: 64 }).notNull(),
    label: varchar('label', { length: 128 }).notNull(),
    value: varchar('value', { length: 128 }).notNull(),
    sort: int('sort').notNull().default(0),
    status: int('status').notNull().default(1),
    remark: varchar('remark', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type DictTypeRecord = {
    id: number
    name: string
    type: string
    status: number
    remark: string | null
    createdAt: Date
}

export type DictDataRecord = {
    id: number
    dictType: string
    label: string
    value: string
    sort: number
    status: number
    remark: string | null
    createdAt: Date
}
