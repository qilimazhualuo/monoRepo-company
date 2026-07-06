import type { DbDriver, DbModule } from '../common'
import { authMysqlSqlList, authPgSqlList } from './auth'
import { basicMysqlSqlList, basicPgSqlList } from './basic'

export {
    authMysqlSqlList,
    authPgSqlList,
    authUsersMysqlSql,
    authUsersPgSql,
} from './auth'

export {
    basicMysqlSqlList,
    basicPgSqlList,
} from './basic'

export const getModuleSchemaSqlList = (module: DbModule, driver: DbDriver) => {
    if (module === 'auth') {
        return driver === 'mysql' ? authMysqlSqlList : authPgSqlList
    }

    return driver === 'mysql' ? basicMysqlSqlList : basicPgSqlList
}

export const initModuleTables = async (
    executeSql: (sqlText: string) => Promise<void>,
    module: DbModule,
    driver: DbDriver,
) => {
    const schemaSqlList = getModuleSchemaSqlList(module, driver)

    for (const schemaSql of schemaSqlList) {
        await executeSql(schemaSql)
    }
}
