import { eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { env } from '../config/env'
import type { DatabaseInstance } from '../db'
import { getUsersTable, isMysqlDriver } from '../models'
import type { UserRecord } from '../models/user'
import { getSession } from './session'
import { parseCookies } from '../utils/auth'

export interface AuthContext {
    userId: number
    username: string
    user: UserRecord
}

export const resolveAuth = async (
    request: Request,
    database: DatabaseInstance,
): Promise<AuthContext | null> => {
    const cookieMap = parseCookies(request.headers.get('cookie'))
    const token = cookieMap[env.cookieName]
    if (!token) {
        return null
    }

    const session = await getSession(token)
    if (!session) {
        return null
    }

    const usersTable = getUsersTable()
    const rows = isMysqlDriver()
        ? await (database as MySql2Database)
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, session.userId))
            .limit(1)
        : await (database as PostgresJsDatabase)
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, session.userId))
            .limit(1)

    const userRecord = rows[0] as UserRecord | undefined
    if (!userRecord || userRecord.status !== 1) {
        return null
    }

    return {
        userId: userRecord.id,
        username: userRecord.username,
        user: userRecord,
    }
}
