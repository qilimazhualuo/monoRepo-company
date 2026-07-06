import { mysqlTable, serial, varchar, timestamp } from 'drizzle-orm/mysql-core'
import { pgTable, serial as pgSerial, varchar as pgVarchar, timestamp as pgTimestamp } from 'drizzle-orm/pg-core'

export const usersPg = pgTable('users', {
    id: pgSerial('id').primaryKey(),
    username: pgVarchar('username', { length: 64 }).notNull().unique(),
    passwordHash: pgVarchar('password_hash', { length: 255 }).notNull(),
    nickname: pgVarchar('nickname', { length: 64 }),
    createdAt: pgTimestamp('created_at').defaultNow().notNull(),
})

export const usersMysql = mysqlTable('users', {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 64 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    nickname: varchar('nickname', { length: 64 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type UserRecord = {
    id: number
    username: string
    passwordHash: string
    nickname: string | null
    createdAt: Date
}
