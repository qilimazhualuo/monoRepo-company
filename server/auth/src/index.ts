import { connectRedis, getRedis, initRedis } from 'auth-kit'
import { startNacosService } from 'nacos-kit'
import { env, initEnv } from './config/env'
import { createBaseApp } from './app'
import { registerAuthRoutes } from './routes/auth'
import { registerInternalRoutes } from './routes/internal'
import { initRsaKeys } from './services/crypto'
import { bootstrapRemoteDatasource, startRemoteDatasourceListener } from './services/remote-datasource'

const bootstrap = async () => {
    const bootstrapConfig = await initEnv()

    initRedis(env.authConfig)
    await connectRedis()

    initRsaKeys()
    await bootstrapRemoteDatasource()
    startRemoteDatasourceListener(getRedis())

    const app = registerInternalRoutes(registerAuthRoutes(createBaseApp()))

    app.listen(env.port)

    await startNacosService(bootstrapConfig, env.port)

    console.log(`[auth] Elysia 已启动: http://localhost:${app.server?.port}`)
}

bootstrap().catch((error) => {
    console.error('[auth] 启动失败:', error)

    if (String(error).includes('password authentication failed') || String(error).includes('ECONNREFUSED')) {
        console.error('')
        console.error('[auth] 连接失败，请确认 basic 已启动且 Redis 可用')
        console.error('[auth] auth 数据源由 basic 分配，不再使用本地 DB_* 配置')
    }

    process.exit(1)
})
