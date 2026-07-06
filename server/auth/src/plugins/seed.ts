import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { Elysia } from 'elysia'
import { env } from '../config/env'
import { getDb, getDbDriver } from '../db'
import { usersMysql, usersPg } from 'types'

export const seedPlugin = new Elysia({ name: 'seed' })
    .onStart(async () => {
        if (getDbDriver() === 'mysql') {
            const database = getDb() as MySql2Database
            const rows = await database
                .select()
                .from(usersMysql)
                .where(eq(usersMysql.username, env.defaultAdminUsername))
                .limit(1)

            if (rows.length > 0) {
                return
            }

            const passwordHash = await bcrypt.hash(env.defaultAdminPassword, 10)
            await database.insert(usersMysql).values({
                username: env.defaultAdminUsername,
                passwordHash,
                nickname: '系统管理员',
            })
        } else {
            const database = getDb() as PostgresJsDatabase
            const rows = await database
                .select()
                .from(usersPg)
                .where(eq(usersPg.username, env.defaultAdminUsername))
                .limit(1)

            if (rows.length > 0) {
                return
            }

            const passwordHash = await bcrypt.hash(env.defaultAdminPassword, 10)
            await database.insert(usersPg).values({
                username: env.defaultAdminUsername,
                passwordHash,
                nickname: '系统管理员',
            })
        }

        console.log(`[seed] 已创建默认管理员: ${env.defaultAdminUsername}`)
    })
