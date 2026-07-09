import { env } from '../config/env'
import { dictDataMysql, dictDataPg, dictTypesMysql, dictTypesPg } from './dict'
import { orgsMysql, orgsPg } from './org'
import { menusMysql, menusPg } from './menu'
import { roleMenusMysql, roleMenusPg, rolesMysql, rolesPg } from './role'
import { userRolesMysql, userRolesPg } from './rbac'
import { usersMysql, usersPg } from './user'

export const isMysqlDriver = () => env.dbDriver === 'mysql'

export const getDictTypesTable = () => (isMysqlDriver() ? dictTypesMysql : dictTypesPg)
export const getDictDataTable = () => (isMysqlDriver() ? dictDataMysql : dictDataPg)
export const getUsersTable = () => (isMysqlDriver() ? usersMysql : usersPg)
export const getOrgsTable = () => (isMysqlDriver() ? orgsMysql : orgsPg)
export const getRolesTable = () => (isMysqlDriver() ? rolesMysql : rolesPg)
export const getMenusTable = () => (isMysqlDriver() ? menusMysql : menusPg)
export const getUserRolesTable = () => (isMysqlDriver() ? userRolesMysql : userRolesPg)
export const getRoleMenusTable = () => (isMysqlDriver() ? roleMenusMysql : roleMenusPg)

export {
    dictTypesMysql,
    dictTypesPg,
    dictDataMysql,
    dictDataPg,
    usersMysql,
    usersPg,
    orgsMysql,
    orgsPg,
    rolesMysql,
    rolesPg,
    menusMysql,
    menusPg,
    userRolesMysql,
    userRolesPg,
    roleMenusMysql,
    roleMenusPg,
}
