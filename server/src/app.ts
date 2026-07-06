import { Elysia } from 'elysia'
import { seedPlugin } from './plugins/seed'
import { setup } from './plugins/setup'

export const createBaseApp = () => new Elysia()
    .use(setup)
    .use(seedPlugin)
    .get('/health', () => ({
        code: '200',
        data: 'ok',
    }))

export type BaseApp = ReturnType<typeof createBaseApp>
