import type { DataSourceConfig } from 'data-kit'
import { t } from 'elysia'
import type { BaseApp } from '../app'
import { env } from '../config/env'
import { applyRemoteDatasource } from '../services/remote-datasource'

const success = <T>(data: T) => ({
    code: '200',
    data,
})

const fail = (code: string, message: string) => ({
    code,
    data: message,
})

const verifyInternalSecret = (secretHeader?: string | null) => {
    return secretHeader === env.internalApiSecret
}

export const registerInternalRoutes = <T extends BaseApp>(app: T) => app
    .post('/api/internal/datasource/apply', async ({ body, request, set }) => {
        if (!verifyInternalSecret(request.headers.get('x-internal-secret'))) {
            set.status = 403
            return fail('403', '无权访问内部接口')
        }

        try {
            await applyRemoteDatasource(
                body.sources as DataSourceConfig[],
                body.defaultSourceId,
            )
            return success(true)
        } catch (error) {
            set.status = 500
            return fail('500', String(error))
        }
    }, {
        body: t.Object({
            sources: t.Array(t.Object({
                id: t.String(),
                name: t.String(),
                driver: t.Union([t.Literal('pg'), t.Literal('mysql')]),
                host: t.String(),
                port: t.Number(),
                user: t.String(),
                password: t.String(),
                database: t.String(),
                isDefault: t.Optional(t.Boolean()),
            })),
            defaultSourceId: t.String(),
        }),
    })
