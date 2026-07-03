import { Elysia } from 'elysia'
import { dbPlugin } from './db'

export const setup = new Elysia({ name: 'setup' })
    .use(dbPlugin)
