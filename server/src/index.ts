import { existsSync } from 'node:fs'
import { env } from './config/env'
import { initDb } from './db'
import { createBaseApp } from './app'
import { createPublicStaticPlugin } from './plugins/publicStatic'
import { registerAuthRoutes } from './routes/auth'
import { initRsaKeys } from './services/crypto'
import { connectRedis, initRedis } from './services/session'

const bootstrap = async () => {
    initRsaKeys()
    initRedis()
    await connectRedis()
    await initDb()

    const appWithAuth = registerAuthRoutes(createBaseApp())

    const app = env.publicEnabled && existsSync(env.publicDir)
        ? appWithAuth.use(createPublicStaticPlugin(env.publicDir))
        : appWithAuth

    if (env.publicEnabled) {
        if (existsSync(env.publicDir)) {
            console.log(`[server] 静态资源目录: ${env.publicDir}`)
        } else {
            console.warn(`[server] 静态资源目录不存在，已跳过: ${env.publicDir}`)
            console.warn('[server] 请先执行 yarn build 生成 dist，或配置 PUBLIC_DIR')
        }
    }

    app.listen(env.port)

    console.log(`[server] Elysia 已启动: http://localhost:${app.server?.port}`)
    console.log(`[server] 数据库: ${env.dbDriver}://${env.dbHost}:${env.dbPort}/${env.dbName}`)
    if (env.publicEnabled) {
        console.log(`[server] 静态资源: 已开启`)
    }
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
