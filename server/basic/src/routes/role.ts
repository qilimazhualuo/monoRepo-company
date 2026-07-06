import { asc, desc, eq, like, and } from 'drizzle-orm'
import { t } from 'elysia'
import type { BaseApp } from '../app'
import { success, fail } from '../utils/response'

const roleBody = t.Object({
    systemId: t.Optional(t.Union([t.Number(), t.Null()])),
    code: t.String(),
    name: t.String(),
    description: t.Optional(t.String()),
    status: t.Optional(t.Number()),
    sortOrder: t.Optional(t.Number()),
})

export const registerRoleRoutes = <T extends BaseApp>(app: T) => app
    .get('/api/basic/roles', async ({ query, db, tables }) => {
        const conditions = []
        if (query.systemId !== undefined) {
            conditions.push(eq(tables.roles.systemId, Number(query.systemId)))
        }
        if (query.keyword) {
            conditions.push(like(tables.roles.name, `%${query.keyword}%`))
        }
        if (query.status !== undefined) {
            conditions.push(eq(tables.roles.status, Number(query.status)))
        }

        const rows = await db
            .select()
            .from(tables.roles)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(asc(tables.roles.sortOrder), desc(tables.roles.id))

        return success(rows)
    }, {
        query: t.Object({
            systemId: t.Optional(t.String()),
            keyword: t.Optional(t.String()),
            status: t.Optional(t.String()),
        }),
    })
    .get('/api/basic/roles/:id', async ({ params, set, db, tables }) => {
        const rows = await db
            .select()
            .from(tables.roles)
            .where(eq(tables.roles.id, Number(params.id)))
            .limit(1)

        if (!rows[0]) {
            set.status = 404
            return fail('404', '角色不存在')
        }

        return success(rows[0])
    })
    .post('/api/basic/roles', async ({ body, db, tables }) => {
        const insertedRows = await db
            .insert(tables.roles)
            .values({
                systemId: body.systemId ?? null,
                code: body.code,
                name: body.name,
                description: body.description,
                status: body.status ?? 1,
                sortOrder: body.sortOrder ?? 0,
            })
            .returning()

        return success(insertedRows[0] ?? true)
    }, {
        body: roleBody,
    })
    .put('/api/basic/roles/:id', async ({ params, body, set, db, tables }) => {
        const updatedRows = await db
            .update(tables.roles)
            .set({
                systemId: body.systemId ?? null,
                code: body.code,
                name: body.name,
                description: body.description,
                status: body.status ?? 1,
                sortOrder: body.sortOrder ?? 0,
                updatedAt: new Date(),
            })
            .where(eq(tables.roles.id, Number(params.id)))
            .returning()

        if (!updatedRows[0]) {
            set.status = 404
            return fail('404', '角色不存在')
        }

        return success(updatedRows[0])
    }, {
        body: roleBody,
    })
    .delete('/api/basic/roles/:id', async ({ params, set, db, tables }) => {
        const deletedRows = await db
            .delete(tables.roles)
            .where(eq(tables.roles.id, Number(params.id)))
            .returning()

        if (!deletedRows[0]) {
            set.status = 404
            return fail('404', '角色不存在')
        }

        await db
            .delete(tables.roleMenus)
            .where(eq(tables.roleMenus.roleId, Number(params.id)))

        await db
            .delete(tables.personnelRoles)
            .where(eq(tables.personnelRoles.roleId, Number(params.id)))

        return success(true)
    })
    .get('/api/basic/roles/:id/menus', async ({ params, db, tables }) => {
        const rows = await db
            .select({ menuId: tables.roleMenus.menuId })
            .from(tables.roleMenus)
            .where(eq(tables.roleMenus.roleId, Number(params.id)))

        return success(rows.map((row) => row.menuId))
    })
    .put('/api/basic/roles/:id/menus', async ({ params, body, db, tables }) => {
        const roleId = Number(params.id)

        await db
            .delete(tables.roleMenus)
            .where(eq(tables.roleMenus.roleId, roleId))

        if (body.menuIds.length > 0) {
            await db.insert(tables.roleMenus).values(
                body.menuIds.map((menuId) => ({
                    roleId,
                    menuId,
                })),
            )
        }

        return success(true)
    }, {
        body: t.Object({
            menuIds: t.Array(t.Number()),
        }),
    })
    .get('/api/basic/personnel/:id/roles', async ({ params, db, tables }) => {
        const rows = await db
            .select({ roleId: tables.personnelRoles.roleId })
            .from(tables.personnelRoles)
            .where(eq(tables.personnelRoles.personnelId, Number(params.id)))

        return success(rows.map((row) => row.roleId))
    })
    .put('/api/basic/personnel/:id/roles', async ({ params, body, db, tables }) => {
        const personnelId = Number(params.id)

        await db
            .delete(tables.personnelRoles)
            .where(eq(tables.personnelRoles.personnelId, personnelId))

        if (body.roleIds.length > 0) {
            await db.insert(tables.personnelRoles).values(
                body.roleIds.map((roleId) => ({
                    personnelId,
                    roleId,
                })),
            )
        }

        return success(true)
    }, {
        body: t.Object({
            roleIds: t.Array(t.Number()),
        }),
    })
