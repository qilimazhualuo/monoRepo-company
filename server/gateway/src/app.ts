import { existsSync } from 'node:fs'
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { env } from './config/env'
import { createPublicStaticPlugin } from './plugins/publicStatic'
import { handleGatewayRequest } from './proxy/forward'
import { registerGatewayInternalRoutes } from './routes/internal'

export const createGatewayApp = () => {
    const app = registerGatewayInternalRoutes(
        new Elysia()
            .use(
                cors({
                    origin: env.corsOrigin,
                    credentials: true,
                    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                    allowedHeaders: ['Content-Type', 'Authorization', 'x-internal-secret'],
                }),
            ),
    )
        .all('/health', ({ request }) => handleGatewayRequest(request))
        .all('/api/*', ({ request }) => handleGatewayRequest(request))

    if (env.publicEnabled && existsSync(env.publicDir)) {
        return app.use(createPublicStaticPlugin(env.publicDir))
    }

    return app
}
