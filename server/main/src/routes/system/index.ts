import { Elysia } from 'elysia'
import { dictRoutes } from './dicts'
import { menuRoutes } from './menus'
import { orgRoutes } from './orgs'
import { roleRoutes } from './roles'
import { userRoutes } from './users'

export const systemRoutes = new Elysia({ name: 'system' })
    .use(orgRoutes)
    .use(menuRoutes)
    .use(roleRoutes)
    .use(userRoutes)
    .use(dictRoutes)
