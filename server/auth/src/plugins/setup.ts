import { Elysia } from 'elysia'
import { createDbPlugin } from './db'

export const createSetup = () => new Elysia({ name: 'setup' })
    .use(createDbPlugin())
