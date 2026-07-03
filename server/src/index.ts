import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { existsSync } from 'node:fs'
import { env } from './config/env'
import { initDatabase } from './db'
import { initRsaKeys } from './services/crypto'
import { seedDefaultAdmin } from './models/user'
import { authRoutes } from './routes/auth'
import { createPublicStaticPlugin } from './plugins/publicStatic'

const bootstrap = async () => {
    initRsaKeys()
    await initDatabase()
    await seedDefaultAdmin()

    let app = new Elysia()
        .use(
            cors({
                origin: env.corsOrigin,
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
            }),
        )
        .get('/health', () => ({
            code: '200',
            data: 'ok',
        }))
        .use(authRoutes)

    if (env.publicEnabled) {
        if (existsSync(env.publicDir)) {
            app = app.use(createPublicStaticPlugin(env.publicDir))
            console.log(`[server] 静态资源目录: ${env.publicDir}`)
        } else {
            console.warn(`[server] 静态资源目录不存在，已跳过: ${env.publicDir}`)
            console.warn('[server] 请先执行 yarn build 生成 dist，或配置 PUBLIC_DIR')
        }
    }

    app.listen(env.port)

    console.log(`[server] Elysia 已启动: http://localhost:${app.server?.port}`)
}

bootstrap().catch((error) => {
    console.error('[server] 启动失败:', error)

    if (String(error).includes('password authentication failed') || String(error).includes('ECONNREFUSED')) {
        console.error('')
        console.error('[server] 数据库连接失败，请检查 server/.env 中的 DB_* 配置')
        console.error('[server] 参考 server/.env.example，确保 PostgreSQL/MySQL 已启动且账号密码正确')
    }

    process.exit(1)
})
