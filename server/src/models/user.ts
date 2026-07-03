import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { env } from '../config/env'
import { getMysqlDatabase, getPgDatabase, initDatabase, usersMysql, usersPg } from '../db'
import type { UserRecord } from '../db/schema'

const mapUserRow = (userRow: {
    id: number
    username: string
    passwordHash: string
    nickname: string | null
    createdAt: Date
}): UserRecord => ({
    id: userRow.id,
    username: userRow.username,
    passwordHash: userRow.passwordHash,
    nickname: userRow.nickname ?? null,
    createdAt: userRow.createdAt,
})

export const findUserByUsername = async (username: string): Promise<UserRecord | null> => {
    await initDatabase()

    if (env.dbDriver === 'mysql') {
        const database = getMysqlDatabase()
        const rows = await database
            .select()
            .from(usersMysql)
            .where(eq(usersMysql.username, username))
            .limit(1)

        return rows[0] ? mapUserRow(rows[0]) : null
    }

    const database = getPgDatabase()
    const rows = await database
        .select()
        .from(usersPg)
        .where(eq(usersPg.username, username))
        .limit(1)

    return rows[0] ? mapUserRow(rows[0]) : null
}

export const findUserById = async (userId: number): Promise<UserRecord | null> => {
    await initDatabase()

    if (env.dbDriver === 'mysql') {
        const database = getMysqlDatabase()
        const rows = await database
            .select()
            .from(usersMysql)
            .where(eq(usersMysql.id, userId))
            .limit(1)

        return rows[0] ? mapUserRow(rows[0]) : null
    }

    const database = getPgDatabase()
    const rows = await database
        .select()
        .from(usersPg)
        .where(eq(usersPg.id, userId))
        .limit(1)

    return rows[0] ? mapUserRow(rows[0]) : null
}

export const createUser = async (
    username: string,
    plainPassword: string,
    nickname?: string,
) => {
    await initDatabase()
    const passwordHash = await bcrypt.hash(plainPassword, 10)

    if (env.dbDriver === 'mysql') {
        const database = getMysqlDatabase()
        await database.insert(usersMysql).values({
            username,
            passwordHash,
            nickname: nickname ?? username,
        })
        return
    }

    const database = getPgDatabase()
    await database.insert(usersPg).values({
        username,
        passwordHash,
        nickname: nickname ?? username,
    })
}

export const verifyPassword = async (plainPassword: string, passwordHash: string) => {
    return bcrypt.compare(plainPassword, passwordHash)
}

export const seedDefaultAdmin = async () => {
    const existingAdmin = await findUserByUsername(env.defaultAdminUsername)

    if (existingAdmin) {
        return
    }

    await createUser(
        env.defaultAdminUsername,
        env.defaultAdminPassword,
        '系统管理员',
    )

    console.log(`[seed] 已创建默认管理员: ${env.defaultAdminUsername}`)
}

export const toPublicUser = (user: UserRecord) => ({
    id: user.id,
    username: user.username,
    nickname: user.nickname,
})
