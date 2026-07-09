import { eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import { Elysia, t } from 'elysia'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { setup } from '../../plugins/setup'
import { getOrgsTable, isMysqlDriver } from '../../models'
import { buildTree } from '../../utils/tree'
import { requireAuth } from '../../utils/guard'
import { fail, success } from '../../utils/response'

const toPublicOrg = (org: {
    id: number
    parentId: number | null
    name: string
    code: string
    sort: number
    status: number
}) => ({
    id: org.id,
    parentId: org.parentId,
    name: org.name,
    code: org.code,
    sort: org.sort,
    status: org.status,
})

export const orgRoutes = new Elysia({ name: 'system-orgs' })
    .use(setup)
    .get('/api/system/orgs/tree', async ({ request, db, set }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const orgsTable = getOrgsTable()
        const rows = isMysqlDriver()
            ? await (db as MySql2Database).select().from(orgsTable)
            : await (db as PostgresJsDatabase).select().from(orgsTable)

        return success(buildTree(rows.map(toPublicOrg)))
    })
    .post(
        '/api/system/orgs',
        async ({ request, db, set, body }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const orgsTable = getOrgsTable()
            const insertResult = isMysqlDriver()
                ? await (db as MySql2Database).insert(orgsTable).values({
                    parentId: body.parentId ?? null,
                    name: body.name,
                    code: body.code,
                    sort: body.sort ?? 0,
                    status: body.status ?? 1,
                })
                : await (db as PostgresJsDatabase).insert(orgsTable).values({
                    parentId: body.parentId ?? null,
                    name: body.name,
                    code: body.code,
                    sort: body.sort ?? 0,
                    status: body.status ?? 1,
                }).returning()

            const createdId = isMysqlDriver()
                ? Number((insertResult as { insertId: number }).insertId)
                : (insertResult as { id: number }[])[0]?.id

            return success({ id: createdId })
        },
        {
            body: t.Object({
                parentId: t.Optional(t.Nullable(t.Number())),
                name: t.String(),
                code: t.String(),
                sort: t.Optional(t.Number()),
                status: t.Optional(t.Number()),
            }),
        },
    )
    .put(
        '/api/system/orgs/:id',
        async ({ request, db, set, body, params }) => {
            const auth = await requireAuth(request, db, set)
            if ('code' in auth) {
                return auth
            }

            const orgId = Number(params.id)
            const orgsTable = getOrgsTable()
            const updatePayload = {
                parentId: body.parentId ?? null,
                name: body.name,
                code: body.code,
                sort: body.sort ?? 0,
                status: body.status ?? 1,
            }

            if (isMysqlDriver()) {
                await (db as MySql2Database)
                    .update(orgsTable)
                    .set(updatePayload)
                    .where(eq(orgsTable.id, orgId))
            } else {
                await (db as PostgresJsDatabase)
                    .update(orgsTable)
                    .set(updatePayload)
                    .where(eq(orgsTable.id, orgId))
            }

            return success(true)
        },
        {
            body: t.Object({
                parentId: t.Optional(t.Nullable(t.Number())),
                name: t.String(),
                code: t.String(),
                sort: t.Optional(t.Number()),
                status: t.Optional(t.Number()),
            }),
        },
    )
    .delete('/api/system/orgs/:id', async ({ request, db, set, params }) => {
        const auth = await requireAuth(request, db, set)
        if ('code' in auth) {
            return auth
        }

        const orgId = Number(params.id)
        const orgsTable = getOrgsTable()
        if (isMysqlDriver()) {
            await (db as MySql2Database).delete(orgsTable).where(eq(orgsTable.id, orgId))
        } else {
            await (db as PostgresJsDatabase).delete(orgsTable).where(eq(orgsTable.id, orgId))
        }

        return success(true)
    })
