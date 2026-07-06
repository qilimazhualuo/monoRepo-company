import { asc, desc, eq, like, and } from 'drizzle-orm'
import { t } from 'elysia'
import type { BaseApp } from '../app'
import { buildTree } from '../utils/helpers'
import { success, fail } from '../utils/response'

const menuBody = t.Object({
    parentId: t.Optional(t.Number()),
    systemId: t.Optional(t.Union([t.Number(), t.Null()])),
    name: t.String(),
    path: t.Optional(t.String()),
    component: t.Optional(t.String()),
    icon: t.Optional(t.String()),
    menuType: t.Optional(t.String()),
    permission: t.Optional(t.String()),
    status: t.Optional(t.Number()),
    visible: t.Optional(t.Number()),
    sortOrder: t.Optional(t.Number()),
})

export const registerMenuRoutes = <T extends BaseApp>(app: T) => app
    .get('/api/basic/menus', async ({ query, db, tables }) => {
        const conditions = []
        if (query.systemId !== undefined) {
            conditions.push(eq(tables.menus.systemId, Number(query.systemId)))
        }
        if (query.keyword) {
            conditions.push(like(tables.menus.name, `%${query.keyword}%`))
        }
        if (query.status !== undefined) {
            conditions.push(eq(tables.menus.status, Number(query.status)))
        }

        const rows = await db
            .select()
            .from(tables.menus)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(asc(tables.menus.sortOrder), desc(tables.menus.id))

        return success(rows)
    }, {
        query: t.Object({
            systemId: t.Optional(t.String()),
            keyword: t.Optional(t.String()),
            status: t.Optional(t.String()),
        }),
    })
    .get('/api/basic/menus/tree', async ({ query, db, tables }) => {
        const conditions = []
        if (query.systemId !== undefined) {
            conditions.push(eq(tables.menus.systemId, Number(query.systemId)))
        }

        const rows = await db
            .select()
            .from(tables.menus)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(asc(tables.menus.sortOrder), desc(tables.menus.id))

        return success(buildTree(rows))
    }, {
        query: t.Object({
            systemId: t.Optional(t.String()),
        }),
    })
    .get('/api/basic/menus/:id', async ({ params, set, db, tables }) => {
        const rows = await db
            .select()
            .from(tables.menus)
            .where(eq(tables.menus.id, Number(params.id)))
            .limit(1)

        if (!rows[0]) {
            set.status = 404
            return fail('404', '菜单不存在')
        }

        return success(rows[0])
    })
    .post('/api/basic/menus', async ({ body, db, tables }) => {
        const insertedRows = await db
            .insert(tables.menus)
            .values({
                parentId: body.parentId ?? 0,
                systemId: body.systemId ?? null,
                name: body.name,
                path: body.path,
                component: body.component,
                icon: body.icon,
                menuType: body.menuType ?? 'menu',
                permission: body.permission,
                status: body.status ?? 1,
                visible: body.visible ?? 1,
                sortOrder: body.sortOrder ?? 0,
            })
            .returning()

        return success(insertedRows[0] ?? true)
    }, {
        body: menuBody,
    })
    .put('/api/basic/menus/:id', async ({ params, body, set, db, tables }) => {
        const updatedRows = await db
            .update(tables.menus)
            .set({
                parentId: body.parentId ?? 0,
                systemId: body.systemId ?? null,
                name: body.name,
                path: body.path,
                component: body.component,
                icon: body.icon,
                menuType: body.menuType ?? 'menu',
                permission: body.permission,
                status: body.status ?? 1,
                visible: body.visible ?? 1,
                sortOrder: body.sortOrder ?? 0,
                updatedAt: new Date(),
            })
            .where(eq(tables.menus.id, Number(params.id)))
            .returning()

        if (!updatedRows[0]) {
            set.status = 404
            return fail('404', '菜单不存在')
        }

        return success(updatedRows[0])
    }, {
        body: menuBody,
    })
    .delete('/api/basic/menus/:id', async ({ params, set, db, tables }) => {
        const deletedRows = await db
            .delete(tables.menus)
            .where(eq(tables.menus.id, Number(params.id)))
            .returning()

        if (!deletedRows[0]) {
            set.status = 404
            return fail('404', '菜单不存在')
        }

        return success(true)
    })
