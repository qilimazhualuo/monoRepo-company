import { Elysia } from 'elysia'
import { env } from './config/env'
import { corsPlugin } from './plugins/cors'
import { tifRoutes } from './routes/tif'

const bootstrap = async () => {
    const app = new Elysia()
        .use(corsPlugin)
        .onError(({ error, set }) => {
            const status = typeof (error as { status?: number }).status === 'number'
                ? (error as { status: number }).status
                : 500
            set.status = status
            return {
                code: String(status),
                data: error instanceof Error ? error.message : 'server error',
            }
        })
        .use(tifRoutes)

    app.listen(env.port)
    console.log(`[tif-load] Elysia 已启动: http://localhost:${app.server?.port}`)
    console.log(`[tif-load] 上传目录: ${env.uploadDir}`)
}

bootstrap().catch((error) => {
    console.error('[tif-load] 启动失败:', error)
    process.exit(1)
})
