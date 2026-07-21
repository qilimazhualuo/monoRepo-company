import { Elysia } from 'elysia'
import { env } from './config/env'
import { initDb } from './db'
import { corsPlugin } from './plugins/cors'
import { routeRoutes } from './routes/route'

const bootstrap = async () => {
    await initDb()

    const app = new Elysia()
        .use(corsPlugin)
        .get('/health', () => ({
            code: '200',
            data: 'ok',
        }))
        .use(routeRoutes)

    app.listen(env.port)

    console.log(`[navigation] Elysia 已启动: http://localhost:${app.server?.port}`)
    console.log(`[navigation] 数据库: postgres://${env.dbHost}:${env.dbPort}/${env.dbName}`)
    console.log(`[navigation] 路网表: ${env.roadTable}.${env.roadGeomColumn}`)
}

bootstrap().catch((error) => {
    console.error('[navigation] 启动失败:', error)

    if (String(error).includes('password authentication failed') || String(error).includes('ECONNREFUSED')) {
        console.error('')
        console.error('[navigation] 数据库连接失败，请检查 server/navigation/.env 中的 DB_* 配置')
        console.error('[navigation] 可先执行 yarn docker:up 启动 PostgreSQL')
        console.error('[navigation] 路网导入说明见 server/navigation/sql/02_import_gpkg.md')
    }

    process.exit(1)
})
