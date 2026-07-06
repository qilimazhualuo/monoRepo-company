import { getActiveDriver, getDataSourceManager, initDataSources, buildLegacyDbEnv } from 'data-kit'
import type { DrizzleDatabase } from 'data-kit'
import { readEnv } from 'nacos-kit'
import { initModuleTables } from 'types'

export type DatabaseInstance = DrizzleDatabase

const runModuleMigrations = async () => {
    const manager = getDataSourceManager()
    await initModuleTables(
        (sqlText) => manager.executeSql(undefined, sqlText),
        'basic',
        getActiveDriver(),
    )
}

export const initDb = async () => {
    await initDataSources(
        readEnv('DATA_SOURCES', ''),
        buildLegacyDbEnv(readEnv),
        readEnv('DEFAULT_DATASOURCE', 'default'),
        readEnv('DEFAULT_DATASOURCE', 'default'),
    )

    await runModuleMigrations()
}

export const getDb = (): DatabaseInstance => getDataSourceManager().getDb()

export const getDbDriver = () => getActiveDriver()

export const reloadDbModule = runModuleMigrations
