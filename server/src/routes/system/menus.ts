import { eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import { Elysia, t } from 'elysia'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { setup } from '../../plugins/setup'
import { getMenusTable, isMysqlDriver } from '../../models'
import { buildTree } from '../../utils/tree'
import { requireAuth } from '../../utils/guard'
import { fail, success } from '../../utils/response'

const toPublicMenu = (menu: {
    id: number
    parentId: number | null
    name: string
    type: string
    path: string | null
    permission: string | null
    icon: string | null
    sort: number
    status: number
}) => ({
    id: menu.id,
    parentId: menu.parentId,
    name: menu.name,
    type: menu.type,
    path: menu.path,
    permission: menu.permission,
    icon: menu.icon,
    sort: menu.sort,
    status: menu.status,
})

export const menuRoutes = new Elysia({ name: 'system-menus' })
    .use(setup)
    .get('/api/system/menus/tree', async ({ request, db, set }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const menusTable = getMenusTable()
        const rows = isMysqlDriver()
            ? await (db as MySql2Database).select().from(menusTable)
            : await (db as PostgresJsDatabase).select().from(menusTable)

        return success(buildTree(rows.map(toPublicMenu)))
    })
    .post(
        '/api/system/menus',
        async ({ request, db, set, body }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const menusTable = getMenusTable()
            const insertPayload = {
                parentId: body.parentId ?? null,
                name: body.name,
                type: body.type ?? 'menu',
                path: body.path ?? null,
                permission: body.permission ?? null,
                icon: body.icon ?? null,
                sort: body.sort ?? 0,
                status: body.status ?? 1,
            }

            const insertResult = isMysqlDriver()
                ? await (db as MySql2Database).insert(menusTable).values(insertPayload)
                : await (db as PostgresJsDatabase).insert(menusTable).values(insertPayload).returning()

            const createdId = isMysqlDriver()
                ? Number((insertResult as { insertId: number }).insertId)
                : (insertResult as { id: number }[])[0]?.id

            return success({ id: createdId })
        },
        {
            body: t.Object({
                parentId: t.Optional(t.Nullable(t.Number())),
                name: t.String(),
                type: t.Optional(t.String()),
                path: t.Optional(t.Nullable(t.String())),
                permission: t.Optional(t.Nullable(t.String())),
                icon: t.Optional(t.Nullable(t.String())),
                sort: t.Optional(t.Number()),
                status: t.Optional(t.Number()),
            }),
        },
    )
    .put(
        '/api/system/menus/:id',
        async ({ request, db, set, body, params }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const menuId = Number(params.id)
            const menusTable = getMenusTable()
            const updatePayload = {
                parentId: body.parentId ?? null,
                name: body.name,
                type: body.type ?? 'menu',
                path: body.path ?? null,
                permission: body.permission ?? null,
                icon: body.icon ?? null,
                sort: body.sort ?? 0,
                status: body.status ?? 1,
            }

            if (isMysqlDriver()) {
                await (db as MySql2Database)
                    .update(menusTable)
                    .set(updatePayload)
                    .where(eq(menusTable.id, menuId))
            } else {
                await (db as PostgresJsDatabase)
                    .update(menusTable)
                    .set(updatePayload)
                    .where(eq(menusTable.id, menuId))
            }

            return success(true)
        },
        {
            body: t.Object({
                parentId: t.Optional(t.Nullable(t.Number())),
                name: t.String(),
                type: t.Optional(t.String()),
                path: t.Optional(t.Nullable(t.String())),
                permission: t.Optional(t.Nullable(t.String())),
                icon: t.Optional(t.Nullable(t.String())),
                sort: t.Optional(t.Number()),
                status: t.Optional(t.Number()),
            }),
        },
    )
    .delete('/api/system/menus/:id', async ({ request, db, set, params }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const menuId = Number(params.id)
        const menusTable = getMenusTable()
        if (isMysqlDriver()) {
            await (db as MySql2Database).delete(menusTable).where(eq(menusTable.id, menuId))
        } else {
            await (db as PostgresJsDatabase).delete(menusTable).where(eq(menusTable.id, menuId))
        }

        return success(true)
    })
