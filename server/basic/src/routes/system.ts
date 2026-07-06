import { asc, desc, eq, like, and } from 'drizzle-orm'
import { t } from 'elysia'
import type { BaseApp } from '../app'
import { success, fail } from '../utils/response'

const systemBody = t.Object({
    code: t.String(),
    name: t.String(),
    description: t.Optional(t.String()),
    status: t.Optional(t.Number()),
    sortOrder: t.Optional(t.Number()),
})

export const registerSystemRoutes = <T extends BaseApp>(app: T) => app
    .get('/api/basic/systems', async ({ query, db, tables }) => {
        const conditions = []
        if (query.keyword) {
            conditions.push(like(tables.systems.name, `%${query.keyword}%`))
        }
        if (query.status !== undefined) {
            conditions.push(eq(tables.systems.status, Number(query.status)))
        }

        const rows = await db
            .select()
            .from(tables.systems)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(asc(tables.systems.sortOrder), desc(tables.systems.id))

        return success(rows)
    }, {
        query: t.Object({
            keyword: t.Optional(t.String()),
            status: t.Optional(t.String()),
        }),
    })
    .get('/api/basic/systems/:id', async ({ params, set, db, tables }) => {
        const rows = await db
            .select()
            .from(tables.systems)
            .where(eq(tables.systems.id, Number(params.id)))
            .limit(1)

        if (!rows[0]) {
            set.status = 404
            return fail('404', '系统不存在')
        }

        return success(rows[0])
    })
    .post('/api/basic/systems', async ({ body, db, tables }) => {
        const insertedRows = await db
            .insert(tables.systems)
            .values({
                code: body.code,
                name: body.name,
                description: body.description,
                status: body.status ?? 1,
                sortOrder: body.sortOrder ?? 0,
            })
            .returning()

        return success(insertedRows[0] ?? true)
    }, {
        body: systemBody,
    })
    .put('/api/basic/systems/:id', async ({ params, body, set, db, tables }) => {
        const updatedRows = await db
            .update(tables.systems)
            .set({
                code: body.code,
                name: body.name,
                description: body.description,
                status: body.status ?? 1,
                sortOrder: body.sortOrder ?? 0,
                updatedAt: new Date(),
            })
            .where(eq(tables.systems.id, Number(params.id)))
            .returning()

        if (!updatedRows[0]) {
            set.status = 404
            return fail('404', '系统不存在')
        }

        return success(updatedRows[0])
    }, {
        body: systemBody,
    })
    .delete('/api/basic/systems/:id', async ({ params, set, db, tables }) => {
        const deletedRows = await db
            .delete(tables.systems)
            .where(eq(tables.systems.id, Number(params.id)))
            .returning()

        if (!deletedRows[0]) {
            set.status = 404
            return fail('404', '系统不存在')
        }

        return success(true)
    })
