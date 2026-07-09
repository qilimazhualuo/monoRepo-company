import { int, mysqlTable, serial, timestamp, varchar } from 'drizzle-orm/mysql-core'
import { integer, pgTable, serial as pgSerial, timestamp as pgTimestamp, varchar as pgVarchar } from 'drizzle-orm/pg-core'

export const usersPg = pgTable('users', {
    id: pgSerial('id').primaryKey(),
    username: pgVarchar('username', { length: 64 }).notNull().unique(),
    passwordHash: pgVarchar('password_hash', { length: 255 }).notNull(),
    nickname: pgVarchar('nickname', { length: 64 }),
    orgId: integer('org_id'),
    phone: pgVarchar('phone', { length: 20 }),
    email: pgVarchar('email', { length: 128 }),
    status: integer('status').notNull().default(1),
    createdAt: pgTimestamp('created_at').defaultNow().notNull(),
})

export const usersMysql = mysqlTable('users', {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 64 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    nickname: varchar('nickname', { length: 64 }),
    orgId: int('org_id'),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 128 }),
    status: int('status').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type UserRecord = {
    id: number
    username: string
    passwordHash: string
    nickname: string | null
    orgId: number | null
    phone: string | null
    email: string | null
    status: number
    createdAt: Date
}
