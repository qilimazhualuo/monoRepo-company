import { existsSync } from 'node:fs'
import { connectRedis, initRedis } from 'auth-kit'
import { startNacosService } from 'nacos-kit'
import { env, initEnv } from './config/env'
import { createGatewayApp } from './app'

const bootstrap = async () => {
    const bootstrapConfig = await initEnv()

    initRedis(env.authConfig)
    await connectRedis()

    const app = createGatewayApp()
    app.listen(env.port)

    await startNacosService(bootstrapConfig, env.port)

    console.log(`[gateway] 已启动: http://localhost:${app.server?.port}`)
    console.log(`[gateway] auth 上游: ${env.authUpstream}`)
    console.log(`[gateway] basic 上游: ${env.basicUpstream}`)

    if (env.publicEnabled) {
        if (existsSync(env.publicDir)) {
            console.log(`[gateway] 静态资源目录: ${env.publicDir}`)
        } else {
            console.warn(`[gateway] 静态资源目录不存在，已跳过: ${env.publicDir}`)
            console.warn('[gateway] 请先执行 yarn build 生成 dist，或配置 PUBLIC_DIR')
        }
    }
}

bootstrap().catch((error) => {
    console.error('[gateway] 启动失败:', error)

    if (String(error).includes('ECONNREFUSED')) {
        console.error('')
        console.error('[gateway] 连接失败，请检查 Redis / 上游服务是否已启动')
    }

    process.exit(1)
})
