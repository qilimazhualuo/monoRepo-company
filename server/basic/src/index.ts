import { buildAuthKitConfig, connectRedis, initRedis } from 'auth-kit'
import { readEnv, startNacosService } from 'nacos-kit'
import { env, initEnv } from './config/env'
import { initDb } from './db'
import { createBaseApp } from './app'
import { registerBasicRoutes } from './routes'
import { seedManagedServiceDatasources } from './services/service-datasource'

const bootstrap = async () => {
    const bootstrapConfig = await initEnv()

    initRedis(env.authConfig)
    await connectRedis()

    await initDb()
    await seedManagedServiceDatasources(bootstrapConfig)

    const app = registerBasicRoutes(createBaseApp())

    app.listen(env.port)

    await startNacosService(bootstrapConfig, env.port)

    console.log(`[basic] Elysia 已启动: http://localhost:${app.server?.port}`)
}

bootstrap().catch((error) => {
    console.error('[basic] 启动失败:', error)

    if (String(error).includes('password authentication failed') || String(error).includes('ECONNREFUSED')) {
        console.error('')
        console.error('[basic] 数据库/Redis 连接失败，请检查 server/basic/.env 配置')
        console.error('[basic] 参考 server/basic/.env.example')
    }

    process.exit(1)
})
