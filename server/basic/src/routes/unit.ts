import { asc, desc, eq, like, and } from 'drizzle-orm'
import { t } from 'elysia'
import type { BaseApp } from '../app'
import { buildTree } from '../utils/helpers'
import { success, fail } from '../utils/response'

const unitBody = t.Object({
    parentId: t.Optional(t.Number()),
    systemId: t.Optional(t.Union([t.Number(), t.Null()])),
    code: t.String(),
    name: t.String(),
    unitType: t.Optional(t.String()),
    leader: t.Optional(t.String()),
    phone: t.Optional(t.String()),
    status: t.Optional(t.Number()),
    sortOrder: t.Optional(t.Number()),
})

export const registerUnitRoutes = <T extends BaseApp>(app: T) => app
    .get('/api/basic/units', async ({ query, db, tables }) => {
        const conditions = []
        if (query.systemId !== undefined) {
            conditions.push(eq(tables.units.systemId, Number(query.systemId)))
        }
        if (query.keyword) {
            conditions.push(like(tables.units.name, `%${query.keyword}%`))
        }
        if (query.status !== undefined) {
            conditions.push(eq(tables.units.status, Number(query.status)))
        }

        const rows = await db
            .select()
            .from(tables.units)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(asc(tables.units.sortOrder), desc(tables.units.id))

        return success(rows)
    }, {
        query: t.Object({
            systemId: t.Optional(t.String()),
            keyword: t.Optional(t.String()),
            status: t.Optional(t.String()),
        }),
    })
    .get('/api/basic/units/tree', async ({ query, db, tables }) => {
        const conditions = []
        if (query.systemId !== undefined) {
            conditions.push(eq(tables.units.systemId, Number(query.systemId)))
        }

        const rows = await db
            .select()
            .from(tables.units)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(asc(tables.units.sortOrder), desc(tables.units.id))

        return success(buildTree(rows))
    }, {
        query: t.Object({
            systemId: t.Optional(t.String()),
        }),
    })
    .get('/api/basic/units/:id', async ({ params, set, db, tables }) => {
        const rows = await db
            .select()
            .from(tables.units)
            .where(eq(tables.units.id, Number(params.id)))
            .limit(1)

        if (!rows[0]) {
            set.status = 404
            return fail('404', '单位不存在')
        }

        return success(rows[0])
    })
    .post('/api/basic/units', async ({ body, db, tables }) => {
        const insertedRows = await db
            .insert(tables.units)
            .values({
                parentId: body.parentId ?? 0,
                systemId: body.systemId ?? null,
                code: body.code,
                name: body.name,
                unitType: body.unitType,
                leader: body.leader,
                phone: body.phone,
                status: body.status ?? 1,
                sortOrder: body.sortOrder ?? 0,
            })
            .returning()

        return success(insertedRows[0] ?? true)
    }, {
        body: unitBody,
    })
    .put('/api/basic/units/:id', async ({ params, body, set, db, tables }) => {
        const updatedRows = await db
            .update(tables.units)
            .set({
                parentId: body.parentId ?? 0,
                systemId: body.systemId ?? null,
                code: body.code,
                name: body.name,
                unitType: body.unitType,
                leader: body.leader,
                phone: body.phone,
                status: body.status ?? 1,
                sortOrder: body.sortOrder ?? 0,
                updatedAt: new Date(),
            })
            .where(eq(tables.units.id, Number(params.id)))
            .returning()

        if (!updatedRows[0]) {
            set.status = 404
            return fail('404', '单位不存在')
        }

        return success(updatedRows[0])
    }, {
        body: unitBody,
    })
    .delete('/api/basic/units/:id', async ({ params, set, db, tables }) => {
        const deletedRows = await db
            .delete(tables.units)
            .where(eq(tables.units.id, Number(params.id)))
            .returning()

        if (!deletedRows[0]) {
            set.status = 404
            return fail('404', '单位不存在')
        }

        return success(true)
    })
