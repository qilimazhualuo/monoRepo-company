import bcrypt from 'bcryptjs'
import { count, eq, like, or } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import { Elysia, t } from 'elysia'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { setup } from '../../plugins/setup'
import { getOrgsTable, getUserRolesTable, getUsersTable, isMysqlDriver } from '../../models'
import type { UserRecord } from '../../models/user'
import { getRolesByUserId, getUserRoleIds } from '../../services/rbac'
import { requireAuth } from '../../utils/guard'
import { parsePageQuery } from '../../utils/tree'
import { fail, success, toPageResult } from '../../utils/response'

const toPublicUser = (user: UserRecord) => ({
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    orgId: user.orgId,
    phone: user.phone,
    email: user.email,
    status: user.status,
    createdAt: user.createdAt,
})

export const userRoutes = new Elysia({ name: 'system-users' })
    .use(setup)
    .get('/api/system/users', async ({ request, db, set, query }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const { page, pageSize, offset } = parsePageQuery(query)
        const usersTable = getUsersTable()
        const keyword = query.keyword?.trim()

        const whereClause = keyword
            ? or(
                like(usersTable.username, `%${keyword}%`),
                like(usersTable.nickname, `%${keyword}%`),
            )
            : undefined

        const listQuery = isMysqlDriver()
            ? (db as MySql2Database).select().from(usersTable)
            : (db as PostgresJsDatabase).select().from(usersTable)

        const countQuery = isMysqlDriver()
            ? (db as MySql2Database).select({ total: count() }).from(usersTable)
            : (db as PostgresJsDatabase).select({ total: count() }).from(usersTable)

        const filteredListQuery = whereClause ? listQuery.where(whereClause) : listQuery
        const filteredCountQuery = whereClause ? countQuery.where(whereClause) : countQuery

        const rows = await filteredListQuery.limit(pageSize).offset(offset)
        const totalRows = await filteredCountQuery
        const total = Number(totalRows[0]?.total ?? 0)

        const orgsTable = getOrgsTable()
        const orgRows = isMysqlDriver()
            ? await (db as MySql2Database).select().from(orgsTable)
            : await (db as PostgresJsDatabase).select().from(orgsTable)
        const orgNameMap = new Map(orgRows.map((org) => [org.id, org.name]))

        const list = await Promise.all(
            (rows as UserRecord[]).map(async (user) => {
                const roles = await getRolesByUserId(db, user.id)
                return {
                    ...toPublicUser(user),
                    orgName: user.orgId ? orgNameMap.get(user.orgId) ?? null : null,
                    roleNames: roles.map((role) => role.name),
                }
            }),
        )

        return success(toPageResult(list, total, page, pageSize))
    })
    .get('/api/system/users/:id/roles', async ({ request, db, set, params }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const userId = Number(params.id)
        const roleIds = await getUserRoleIds(db, userId)
        return success(roleIds)
    })
    .post(
        '/api/system/users',
        async ({ request, db, set, body }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const usersTable = getUsersTable()
            const passwordHash = await bcrypt.hash(body.password, 10)
            const insertPayload = {
                username: body.username,
                passwordHash,
                nickname: body.nickname ?? null,
                orgId: body.orgId ?? null,
                phone: body.phone ?? null,
                email: body.email ?? null,
                status: body.status ?? 1,
            }

            try {
                const insertResult = isMysqlDriver()
                    ? await (db as MySql2Database).insert(usersTable).values(insertPayload)
                    : await (db as PostgresJsDatabase).insert(usersTable).values(insertPayload).returning()

                const createdId = isMysqlDriver()
                    ? Number((insertResult as { insertId: number }).insertId)
                    : (insertResult as { id: number }[])[0]?.id

                if (body.roleIds?.length) {
                    const userRolesTable = getUserRolesTable()
                    const roleValues = body.roleIds.map((roleId) => ({
                        userId: createdId,
                        roleId,
                    }))

                    if (isMysqlDriver()) {
                        await (db as MySql2Database).insert(userRolesTable).values(roleValues)
                    } else {
                        await (db as PostgresJsDatabase).insert(userRolesTable).values(roleValues)
                    }
                }

                return success({ id: createdId })
            } catch {
                set.status = 400
                return fail('400', '用户名已存在')
            }
        },
        {
            body: t.Object({
                username: t.String(),
                password: t.String(),
                nickname: t.Optional(t.Nullable(t.String())),
                orgId: t.Optional(t.Nullable(t.Number())),
                phone: t.Optional(t.Nullable(t.String())),
                email: t.Optional(t.Nullable(t.String())),
                status: t.Optional(t.Number()),
                roleIds: t.Optional(t.Array(t.Number())),
            }),
        },
    )
    .put(
        '/api/system/users/:id',
        async ({ request, db, set, body, params }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const userId = Number(params.id)
            const usersTable = getUsersTable()
            const updatePayload: Record<string, unknown> = {
                nickname: body.nickname ?? null,
                orgId: body.orgId ?? null,
                phone: body.phone ?? null,
                email: body.email ?? null,
                status: body.status ?? 1,
            }

            if (body.password) {
                updatePayload.passwordHash = await bcrypt.hash(body.password, 10)
            }

            if (isMysqlDriver()) {
                await (db as MySql2Database)
                    .update(usersTable)
                    .set(updatePayload)
                    .where(eq(usersTable.id, userId))
            } else {
                await (db as PostgresJsDatabase)
                    .update(usersTable)
                    .set(updatePayload)
                    .where(eq(usersTable.id, userId))
            }

            return success(true)
        },
        {
            body: t.Object({
                nickname: t.Optional(t.Nullable(t.String())),
                orgId: t.Optional(t.Nullable(t.Number())),
                phone: t.Optional(t.Nullable(t.String())),
                email: t.Optional(t.Nullable(t.String())),
                status: t.Optional(t.Number()),
                password: t.Optional(t.String()),
            }),
        },
    )
    .put(
        '/api/system/users/:id/roles',
        async ({ request, db, set, body, params }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const userId = Number(params.id)
            const userRolesTable = getUserRolesTable()

            if (isMysqlDriver()) {
                await (db as MySql2Database)
                    .delete(userRolesTable)
                    .where(eq(userRolesTable.userId, userId))
            } else {
                await (db as PostgresJsDatabase)
                    .delete(userRolesTable)
                    .where(eq(userRolesTable.userId, userId))
            }

            if (body.roleIds.length > 0) {
                const values = body.roleIds.map((roleId) => ({
                    userId,
                    roleId,
                }))

                if (isMysqlDriver()) {
                    await (db as MySql2Database).insert(userRolesTable).values(values)
                } else {
                    await (db as PostgresJsDatabase).insert(userRolesTable).values(values)
                }
            }

            return success(true)
        },
        {
            body: t.Object({
                roleIds: t.Array(t.Number()),
            }),
        },
    )
    .delete('/api/system/users/:id', async ({ request, db, set, params }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const userId = Number(params.id)
        if (userId === auth.userId) {
            set.status = 400
            return fail('400', '不能删除当前登录用户')
        }

        const usersTable = getUsersTable()
        const userRolesTable = getUserRolesTable()

        if (isMysqlDriver()) {
            await (db as MySql2Database).delete(userRolesTable).where(eq(userRolesTable.userId, userId))
            await (db as MySql2Database).delete(usersTable).where(eq(usersTable.id, userId))
        } else {
            await (db as PostgresJsDatabase).delete(userRolesTable).where(eq(userRolesTable.userId, userId))
            await (db as PostgresJsDatabase).delete(usersTable).where(eq(usersTable.id, userId))
        }

        return success(true)
    })
