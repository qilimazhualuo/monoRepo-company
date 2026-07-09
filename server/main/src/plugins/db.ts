import { Elysia } from 'elysia'
import { env } from '../config/env'
import { getDb } from '../db'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

const mysqlDbPlugin = new Elysia({ name: 'db' })
    .derive({ as: 'global' }, () => ({
        db: getDb() as MySql2Database,
    }))

const pgDbPlugin = new Elysia({ name: 'db' })
    .derive({ as: 'global' }, () => ({
        db: getDb() as PostgresJsDatabase,
    }))

export const dbPlugin = env.dbDriver === 'mysql' ? mysqlDbPlugin : pgDbPlugin
