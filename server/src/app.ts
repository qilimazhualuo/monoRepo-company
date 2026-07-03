import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { env } from './config/env'
import { seedPlugin } from './plugins/seed'
import { setup } from './plugins/setup'

export const createBaseApp = () => new Elysia()
    .use(
        cors({
            origin: env.corsOrigin,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        }),
    )
    .use(setup)
    .use(seedPlugin)
    .get('/health', () => ({
        code: '200',
        data: 'ok',
    }))

export type BaseApp = ReturnType<typeof createBaseApp>
