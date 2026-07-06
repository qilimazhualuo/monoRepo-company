import { Elysia } from 'elysia'
import { getDb, getDbDriver } from '../db'
import { usersMysql, usersPg } from 'types'
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

export const createDbPlugin = () => (
    getDbDriver() === 'mysql' ? mysqlDbPlugin : pgDbPlugin
)
