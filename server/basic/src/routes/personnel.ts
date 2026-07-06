import { asc, desc, eq, like, and } from 'drizzle-orm'
import { t } from 'elysia'
import type { BaseApp } from '../app'
import { success, fail } from '../utils/response'

const personnelBody = t.Object({
    unitId: t.Optional(t.Union([t.Number(), t.Null()])),
    account: t.Optional(t.String()),
    name: t.String(),
    phone: t.Optional(t.String()),
    email: t.Optional(t.String()),
    gender: t.Optional(t.Number()),
    status: t.Optional(t.Number()),
    remark: t.Optional(t.String()),
})

export const registerPersonnelRoutes = <T extends BaseApp>(app: T) => app
    .get('/api/basic/personnel', async ({ query, db, tables }) => {
        const conditions = []
        if (query.unitId !== undefined) {
            conditions.push(eq(tables.personnel.unitId, Number(query.unitId)))
        }
        if (query.keyword) {
            conditions.push(like(tables.personnel.name, `%${query.keyword}%`))
        }
        if (query.status !== undefined) {
            conditions.push(eq(tables.personnel.status, Number(query.status)))
        }

        const rows = await db
            .select()
            .from(tables.personnel)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(tables.personnel.id))

        return success(rows)
    }, {
        query: t.Object({
            unitId: t.Optional(t.String()),
            keyword: t.Optional(t.String()),
            status: t.Optional(t.String()),
        }),
    })
    .get('/api/basic/personnel/:id', async ({ params, set, db, tables }) => {
        const rows = await db
            .select()
            .from(tables.personnel)
            .where(eq(tables.personnel.id, Number(params.id)))
            .limit(1)

        if (!rows[0]) {
            set.status = 404
            return fail('404', '人员不存在')
        }

        return success(rows[0])
    })
    .post('/api/basic/personnel', async ({ body, db, tables }) => {
        const insertedRows = await db
            .insert(tables.personnel)
            .values({
                unitId: body.unitId ?? null,
                account: body.account,
                name: body.name,
                phone: body.phone,
                email: body.email,
                gender: body.gender ?? 0,
                status: body.status ?? 1,
                remark: body.remark,
            })
            .returning()

        return success(insertedRows[0] ?? true)
    }, {
        body: personnelBody,
    })
    .put('/api/basic/personnel/:id', async ({ params, body, set, db, tables }) => {
        const updatedRows = await db
            .update(tables.personnel)
            .set({
                unitId: body.unitId ?? null,
                account: body.account,
                name: body.name,
                phone: body.phone,
                email: body.email,
                gender: body.gender ?? 0,
                status: body.status ?? 1,
                remark: body.remark,
                updatedAt: new Date(),
            })
            .where(eq(tables.personnel.id, Number(params.id)))
            .returning()

        if (!updatedRows[0]) {
            set.status = 404
            return fail('404', '人员不存在')
        }

        return success(updatedRows[0])
    }, {
        body: personnelBody,
    })
    .delete('/api/basic/personnel/:id', async ({ params, set, db, tables }) => {
        const deletedRows = await db
            .delete(tables.personnel)
            .where(eq(tables.personnel.id, Number(params.id)))
            .returning()

        if (!deletedRows[0]) {
            set.status = 404
            return fail('404', '人员不存在')
        }

        return success(true)
    })
