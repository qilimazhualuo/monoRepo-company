import { Elysia } from 'elysia'
import { env } from './config/env'
import { initDb } from './db'
import { corsPlugin } from './plugins/cors'
import { publicStaticPlugin } from './plugins/publicStatic'
import { seedPlugin } from './plugins/seed'
import { setup } from './plugins/setup'
import { authRoutes } from './routes/auth'
import { systemRoutes } from './routes/system'
import { initRsaKeys } from './services/crypto'
import { connectRedis, initRedis } from './services/session'

const bootstrap = async () => {
    initRsaKeys()
    initRedis()
    await connectRedis()
    await initDb()

    const app = new Elysia()
        .use(corsPlugin)
        .use(setup)
        .use(seedPlugin)
        .get('/health', () => ({
            code: '200',
            data: 'ok',
        }))
        .use(authRoutes)
        .use(systemRoutes)
        .use(publicStaticPlugin)

    app.listen(env.port)

    console.log(`[server] Elysia 已启动: http://localhost:${app.server?.port}`)
    console.log(`[server] 数据库: ${env.dbDriver}://${env.dbHost}:${env.dbPort}/${env.dbName}`)
    console.log(`[server] 静态资源目录: ${env.publicDir}`)
}

bootstrap().catch((error) => {
    console.error('[server] 启动失败:', error)

    if (String(error).includes('password authentication failed') || String(error).includes('ECONNREFUSED')) {
        console.error('')
        console.error('[server] 数据库或 Redis 连接失败，请检查 server/.env 中的 DB_* / REDIS_* 配置')
        console.error('[server] 可先执行 yarn docker:up 启动 PostgreSQL / MySQL / Redis')
        console.error('[server] 参考 server/.env.example，确保服务已启动且账号密码正确')
    }

    process.exit(1)
})
