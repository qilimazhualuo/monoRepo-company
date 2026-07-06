import type { BaseApp } from '../app'
import { registerDataSourceRoutes } from './datasource'
import { registerInternalRoutes, registerServiceDatasourceRoutes } from './internal'
import { registerMenuRoutes } from './menu'
import { registerPersonnelRoutes } from './personnel'
import { registerRoleRoutes } from './role'
import { registerSystemRoutes } from './system'
import { registerUnitRoutes } from './unit'

export const registerBasicRoutes = <T extends BaseApp>(app: T) => registerInternalRoutes(
    registerServiceDatasourceRoutes(
        registerDataSourceRoutes(
            registerRoleRoutes(
                registerMenuRoutes(
                    registerPersonnelRoutes(
                        registerUnitRoutes(
                            registerSystemRoutes(app),
                        ),
                    ),
                ),
            ),
        ),
    ),
)
