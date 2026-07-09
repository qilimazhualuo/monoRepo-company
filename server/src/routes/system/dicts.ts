import { and, asc, count, eq, inArray, like, or } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import { Elysia, t } from 'elysia'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { setup } from '../../plugins/setup'
import { getDictDataTable, getDictTypesTable, isMysqlDriver } from '../../models'
import type { DictDataRecord, DictTypeRecord } from '../../models/dict'
import { requireAuth } from '../../utils/guard'
import { parsePageQuery } from '../../utils/tree'
import { success, toPageResult } from '../../utils/response'

const toPublicDictType = (dictType: DictTypeRecord) => ({
    id: dictType.id,
    name: dictType.name,
    type: dictType.type,
    status: dictType.status,
    remark: dictType.remark,
    createdAt: dictType.createdAt,
})

const toPublicDictData = (dictData: DictDataRecord) => ({
    id: dictData.id,
    dictType: dictData.dictType,
    label: dictData.label,
    value: dictData.value,
    sort: dictData.sort,
    status: dictData.status,
    remark: dictData.remark,
    createdAt: dictData.createdAt,
})

const toDictOption = (dictData: DictDataRecord) => ({
    label: dictData.label,
    value: dictData.value,
})

const fetchDictDataByTypes = async (
    db: MySql2Database | PostgresJsDatabase,
    dictTypes: string[],
) => {
    if (dictTypes.length === 0) {
        return {} as Record<string, ReturnType<typeof toDictOption>[]>
    }

    const dictDataTable = getDictDataTable()
    const rows = isMysqlDriver()
        ? await (db as MySql2Database)
            .select()
            .from(dictDataTable)
            .where(and(
                inArray(dictDataTable.dictType, dictTypes),
                eq(dictDataTable.status, 1),
            ))
            .orderBy(asc(dictDataTable.sort), asc(dictDataTable.id))
        : await (db as PostgresJsDatabase)
            .select()
            .from(dictDataTable)
            .where(and(
                inArray(dictDataTable.dictType, dictTypes),
                eq(dictDataTable.status, 1),
            ))
            .orderBy(asc(dictDataTable.sort), asc(dictDataTable.id))

    const result: Record<string, ReturnType<typeof toDictOption>[]> = {}
    dictTypes.forEach((dictType) => {
        result[dictType] = []
    })

    ;(rows as DictDataRecord[]).forEach((dictData) => {
        result[dictData.dictType]?.push(toDictOption(dictData))
    })

    return result
}

export const dictRoutes = new Elysia({ name: 'system-dicts' })
    .use(setup)
    .get('/api/system/dict/types', async ({ request, db, set, query }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const { page, pageSize, offset } = parsePageQuery(query)
        const dictTypesTable = getDictTypesTable()
        const keyword = query.keyword?.trim()

        const whereClause = keyword
            ? or(
                like(dictTypesTable.name, `%${keyword}%`),
                like(dictTypesTable.type, `%${keyword}%`),
            )
            : undefined

        const listQuery = isMysqlDriver()
            ? (db as MySql2Database).select().from(dictTypesTable)
            : (db as PostgresJsDatabase).select().from(dictTypesTable)

        const countQuery = isMysqlDriver()
            ? (db as MySql2Database).select({ total: count() }).from(dictTypesTable)
            : (db as PostgresJsDatabase).select({ total: count() }).from(dictTypesTable)

        const filteredListQuery = whereClause ? listQuery.where(whereClause) : listQuery
        const filteredCountQuery = whereClause ? countQuery.where(whereClause) : countQuery

        const rows = await filteredListQuery
            .orderBy(asc(dictTypesTable.id))
            .limit(pageSize)
            .offset(offset)
        const totalRows = await filteredCountQuery
        const total = Number(totalRows[0]?.total ?? 0)

        return success(toPageResult(
            (rows as DictTypeRecord[]).map(toPublicDictType),
            total,
            page,
            pageSize,
        ))
    })
    .post(
        '/api/system/dict/types',
        async ({ request, db, set, body }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const dictTypesTable = getDictTypesTable()
            const insertResult = isMysqlDriver()
                ? await (db as MySql2Database).insert(dictTypesTable).values({
                    name: body.name,
                    type: body.type,
                    status: body.status ?? 1,
                    remark: body.remark ?? null,
                })
                : await (db as PostgresJsDatabase).insert(dictTypesTable).values({
                    name: body.name,
                    type: body.type,
                    status: body.status ?? 1,
                    remark: body.remark ?? null,
                }).returning()

            const createdId = isMysqlDriver()
                ? Number((insertResult as { insertId: number }).insertId)
                : (insertResult as { id: number }[])[0]?.id

            return success({ id: createdId })
        },
        {
            body: t.Object({
                name: t.String(),
                type: t.String(),
                status: t.Optional(t.Number()),
                remark: t.Optional(t.Nullable(t.String())),
            }),
        },
    )
    .put(
        '/api/system/dict/types/:id',
        async ({ request, db, set, body, params }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const dictTypeId = Number(params.id)
            const dictTypesTable = getDictTypesTable()
            const updatePayload = {
                name: body.name,
                type: body.type,
                status: body.status ?? 1,
                remark: body.remark ?? null,
            }

            if (isMysqlDriver()) {
                await (db as MySql2Database)
                    .update(dictTypesTable)
                    .set(updatePayload)
                    .where(eq(dictTypesTable.id, dictTypeId))
            } else {
                await (db as PostgresJsDatabase)
                    .update(dictTypesTable)
                    .set(updatePayload)
                    .where(eq(dictTypesTable.id, dictTypeId))
            }

            return success(true)
        },
        {
            body: t.Object({
                name: t.String(),
                type: t.String(),
                status: t.Optional(t.Number()),
                remark: t.Optional(t.Nullable(t.String())),
            }),
        },
    )
    .delete('/api/system/dict/types/:id', async ({ request, db, set, params }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const dictTypeId = Number(params.id)
        const dictTypesTable = getDictTypesTable()
        const dictDataTable = getDictDataTable()

        const existingRows = isMysqlDriver()
            ? await (db as MySql2Database)
                .select()
                .from(dictTypesTable)
                .where(eq(dictTypesTable.id, dictTypeId))
                .limit(1)
            : await (db as PostgresJsDatabase)
                .select()
                .from(dictTypesTable)
                .where(eq(dictTypesTable.id, dictTypeId))
                .limit(1)

        const dictType = existingRows[0] as DictTypeRecord | undefined
        if (!dictType) {
            return success(true)
        }

        if (isMysqlDriver()) {
            await (db as MySql2Database).delete(dictDataTable).where(eq(dictDataTable.dictType, dictType.type))
            await (db as MySql2Database).delete(dictTypesTable).where(eq(dictTypesTable.id, dictTypeId))
        } else {
            await (db as PostgresJsDatabase).delete(dictDataTable).where(eq(dictDataTable.dictType, dictType.type))
            await (db as PostgresJsDatabase).delete(dictTypesTable).where(eq(dictTypesTable.id, dictTypeId))
        }

        return success(true)
    })
    .get('/api/system/dict/data', async ({ request, db, set, query }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const { page, pageSize, offset } = parsePageQuery(query)
        const dictDataTable = getDictDataTable()
        const dictType = query.dictType?.trim()
        const keyword = query.keyword?.trim()

        const filters = []
        if (dictType) {
            filters.push(eq(dictDataTable.dictType, dictType))
        }
        if (keyword) {
            filters.push(or(
                like(dictDataTable.label, `%${keyword}%`),
                like(dictDataTable.value, `%${keyword}%`),
            ))
        }

        const whereClause = filters.length > 0 ? and(...filters) : undefined

        const listQuery = isMysqlDriver()
            ? (db as MySql2Database).select().from(dictDataTable)
            : (db as PostgresJsDatabase).select().from(dictDataTable)

        const countQuery = isMysqlDriver()
            ? (db as MySql2Database).select({ total: count() }).from(dictDataTable)
            : (db as PostgresJsDatabase).select({ total: count() }).from(dictDataTable)

        const filteredListQuery = whereClause ? listQuery.where(whereClause) : listQuery
        const filteredCountQuery = whereClause ? countQuery.where(whereClause) : countQuery

        const rows = await filteredListQuery
            .orderBy(asc(dictDataTable.sort), asc(dictDataTable.id))
            .limit(pageSize)
            .offset(offset)
        const totalRows = await filteredCountQuery
        const total = Number(totalRows[0]?.total ?? 0)

        return success(toPageResult(
            (rows as DictDataRecord[]).map(toPublicDictData),
            total,
            page,
            pageSize,
        ))
    })
    .get('/api/system/dict/data/type/:dictType', async ({ request, db, set, params }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const dictType = params.dictType
        const result = await fetchDictDataByTypes(db, [dictType])
        return success(result[dictType] ?? [])
    })
    .get('/api/system/dict/data/batch', async ({ request, db, set, query }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const dictTypes = (query.types ?? '')
            .split(',')
            .map((dictType) => dictType.trim())
            .filter(Boolean)

        return success(await fetchDictDataByTypes(db, dictTypes))
    })
    .post(
        '/api/system/dict/data',
        async ({ request, db, set, body }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const dictDataTable = getDictDataTable()
            const insertResult = isMysqlDriver()
                ? await (db as MySql2Database).insert(dictDataTable).values({
                    dictType: body.dictType,
                    label: body.label,
                    value: body.value,
                    sort: body.sort ?? 0,
                    status: body.status ?? 1,
                    remark: body.remark ?? null,
                })
                : await (db as PostgresJsDatabase).insert(dictDataTable).values({
                    dictType: body.dictType,
                    label: body.label,
                    value: body.value,
                    sort: body.sort ?? 0,
                    status: body.status ?? 1,
                    remark: body.remark ?? null,
                }).returning()

            const createdId = isMysqlDriver()
                ? Number((insertResult as { insertId: number }).insertId)
                : (insertResult as { id: number }[])[0]?.id

            return success({ id: createdId })
        },
        {
            body: t.Object({
                dictType: t.String(),
                label: t.String(),
                value: t.String(),
                sort: t.Optional(t.Number()),
                status: t.Optional(t.Number()),
                remark: t.Optional(t.Nullable(t.String())),
            }),
        },
    )
    .put(
        '/api/system/dict/data/:id',
        async ({ request, db, set, body, params }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const dictDataId = Number(params.id)
            const dictDataTable = getDictDataTable()
            const updatePayload = {
                dictType: body.dictType,
                label: body.label,
                value: body.value,
                sort: body.sort ?? 0,
                status: body.status ?? 1,
                remark: body.remark ?? null,
            }

            if (isMysqlDriver()) {
                await (db as MySql2Database)
                    .update(dictDataTable)
                    .set(updatePayload)
                    .where(eq(dictDataTable.id, dictDataId))
            } else {
                await (db as PostgresJsDatabase)
                    .update(dictDataTable)
                    .set(updatePayload)
                    .where(eq(dictDataTable.id, dictDataId))
            }

            return success(true)
        },
        {
            body: t.Object({
                dictType: t.String(),
                label: t.String(),
                value: t.String(),
                sort: t.Optional(t.Number()),
                status: t.Optional(t.Number()),
                remark: t.Optional(t.Nullable(t.String())),
            }),
        },
    )
    .delete('/api/system/dict/data/:id', async ({ request, db, set, params }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const dictDataId = Number(params.id)
        const dictDataTable = getDictDataTable()

        if (isMysqlDriver()) {
            await (db as MySql2Database).delete(dictDataTable).where(eq(dictDataTable.id, dictDataId))
        } else {
            await (db as PostgresJsDatabase).delete(dictDataTable).where(eq(dictDataTable.id, dictDataId))
        }

        return success(true)
    })
