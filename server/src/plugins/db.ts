import { Elysia } from 'elysia'
import { env } from '../config/env'
import { getDb } from '../db'
import { usersMysql, usersPg } from '../models/user'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

const mysqlDbPlugin = new Elysia({ name: 'db' })
    .derive({ as: 'global' }, () => ({
        db: getDb() as MySql2Database,
        users: usersMysql,
    }))

const pgDbPlugin = new Elysia({ name: 'db' })
    .derive({ as: 'global' }, () => ({
        db: getDb() as PostgresJsDatabase,
        users: usersPg,
    }))

export const dbPlugin = env.dbDriver === 'mysql' ? mysqlDbPlugin : pgDbPlugin
