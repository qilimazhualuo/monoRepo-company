import { Elysia } from 'elysia'
import { getDb, getDbDriver } from '../db'
import {
    menusMysql,
    menusPg,
    personnelMysql,
    personnelPg,
    roleMenusMysql,
    roleMenusPg,
    rolesMysql,
    rolesPg,
    personnelRolesMysql,
    personnelRolesPg,
    systemsMysql,
    systemsPg,
    unitsMysql,
    unitsPg,
} from 'types'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

const mysqlDbPlugin = new Elysia({ name: 'db' })
    .derive({ as: 'global' }, () => ({
        db: getDb() as MySql2Database,
        tables: {
            systems: systemsMysql,
            units: unitsMysql,
            personnel: personnelMysql,
            menus: menusMysql,
            roles: rolesMysql,
            roleMenus: roleMenusMysql,
            personnelRoles: personnelRolesMysql,
        },
    }))

const pgDbPlugin = new Elysia({ name: 'db' })
    .derive({ as: 'global' }, () => ({
        db: getDb() as PostgresJsDatabase,
        tables: {
            systems: systemsPg,
            units: unitsPg,
            personnel: personnelPg,
            menus: menusPg,
            roles: rolesPg,
            roleMenus: roleMenusPg,
            personnelRoles: personnelRolesPg,
        },
    }))

export const createDbPlugin = () => (
    getDbDriver() === 'mysql' ? mysqlDbPlugin : pgDbPlugin
)
