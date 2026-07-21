import { Elysia, t } from 'elysia'
import { computeRoute, getRoadNetworkStatus } from '../services/routing'
import { fail, success } from '../utils/response'

const pointSchema = t.Object({
    longitude: t.Number({ minimum: -180, maximum: 180 }),
    latitude: t.Number({ minimum: -90, maximum: 90 }),
})

export const routeRoutes = new Elysia({ prefix: '/api' })
    .get('/health', () => success('ok'))
    .get('/road-status', async () => {
        try {
            const status = await getRoadNetworkStatus()
            return success(status)
        } catch (error) {
            return fail('500', error instanceof Error ? error.message : '查询路网状态失败')
        }
    })
    .post(
        '/route',
        async ({ body }) => {
            try {
                const result = await computeRoute(body.start, body.end)
                return success(result)
            } catch (error) {
                return fail('400', error instanceof Error ? error.message : '算路失败')
            }
        },
        {
            body: t.Object({
                start: pointSchema,
                end: pointSchema,
            }),
        },
    )
