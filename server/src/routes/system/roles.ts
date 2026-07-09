import { eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import { Elysia, t } from 'elysia'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { setup } from '../../plugins/setup'
import { getRoleMenusTable, getRolesTable, isMysqlDriver } from '../../models'
import { getRoleMenuIds } from '../../services/rbac'
import { requireAuth } from '../../utils/guard'
import { success } from '../../utils/response'

const toPublicRole = (role: {
    id: number
    code: string
    name: string
    description: string | null
    status: number
}) => ({
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    status: role.status,
})

export const roleRoutes = new Elysia({ name: 'system-roles' })
    .use(setup)
    .get('/api/system/roles', async ({ request, db, set }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const rolesTable = getRolesTable()
        const rows = isMysqlDriver()
            ? await (db as MySql2Database).select().from(rolesTable)
            : await (db as PostgresJsDatabase).select().from(rolesTable)

        return success(rows.map(toPublicRole))
    })
    .get('/api/system/roles/:id/menus', async ({ request, db, set, params }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const roleId = Number(params.id)
        const menuIds = await getRoleMenuIds(db, roleId)
        return success(menuIds)
    })
    .post(
        '/api/system/roles',
        async ({ request, db, set, body }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const rolesTable = getRolesTable()
            const insertResult = isMysqlDriver()
                ? await (db as MySql2Database).insert(rolesTable).values({
                    code: body.code,
                    name: body.name,
                    description: body.description ?? null,
                    status: body.status ?? 1,
                })
                : await (db as PostgresJsDatabase).insert(rolesTable).values({
                    code: body.code,
                    name: body.name,
                    description: body.description ?? null,
                    status: body.status ?? 1,
                }).returning()

            const createdId = isMysqlDriver()
                ? Number((insertResult as { insertId: number }).insertId)
                : (insertResult as { id: number }[])[0]?.id

            return success({ id: createdId })
        },
        {
            body: t.Object({
                code: t.String(),
                name: t.String(),
                description: t.Optional(t.Nullable(t.String())),
                status: t.Optional(t.Number()),
            }),
        },
    )
    .put(
        '/api/system/roles/:id',
        async ({ request, db, set, body, params }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const roleId = Number(params.id)
            const rolesTable = getRolesTable()
            const updatePayload = {
                code: body.code,
                name: body.name,
                description: body.description ?? null,
                status: body.status ?? 1,
            }

            if (isMysqlDriver()) {
                await (db as MySql2Database)
                    .update(rolesTable)
                    .set(updatePayload)
                    .where(eq(rolesTable.id, roleId))
            } else {
                await (db as PostgresJsDatabase)
                    .update(rolesTable)
                    .set(updatePayload)
                    .where(eq(rolesTable.id, roleId))
            }

            return success(true)
        },
        {
            body: t.Object({
                code: t.String(),
                name: t.String(),
                description: t.Optional(t.Nullable(t.String())),
                status: t.Optional(t.Number()),
            }),
        },
    )
    .put(
        '/api/system/roles/:id/menus',
        async ({ request, db, set, body, params }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const roleId = Number(params.id)
            const roleMenusTable = getRoleMenusTable()

            if (isMysqlDriver()) {
                await (db as MySql2Database)
                    .delete(roleMenusTable)
                    .where(eq(roleMenusTable.roleId, roleId))
            } else {
                await (db as PostgresJsDatabase)
                    .delete(roleMenusTable)
                    .where(eq(roleMenusTable.roleId, roleId))
            }

            if (body.menuIds.length > 0) {
                const values = body.menuIds.map((menuId) => ({
                    roleId,
                    menuId,
                }))

                if (isMysqlDriver()) {
                    await (db as MySql2Database).insert(roleMenusTable).values(values)
                } else {
                    await (db as PostgresJsDatabase).insert(roleMenusTable).values(values)
                }
            }

            return success(true)
        },
        {
            body: t.Object({
                menuIds: t.Array(t.Number()),
            }),
        },
    )
    .delete('/api/system/roles/:id', async ({ request, db, set, params }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const roleId = Number(params.id)
        const rolesTable = getRolesTable()
        const roleMenusTable = getRoleMenusTable()

        if (isMysqlDriver()) {
            await (db as MySql2Database).delete(roleMenusTable).where(eq(roleMenusTable.roleId, roleId))
            await (db as MySql2Database).delete(rolesTable).where(eq(rolesTable.id, roleId))
        } else {
            await (db as PostgresJsDatabase).delete(roleMenusTable).where(eq(roleMenusTable.roleId, roleId))
            await (db as PostgresJsDatabase).delete(rolesTable).where(eq(rolesTable.id, roleId))
        }

        return success(true)
    })
