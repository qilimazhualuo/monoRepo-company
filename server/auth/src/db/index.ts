import { getActiveDriver, getDataSourceManager } from 'data-kit'
import type { DrizzleDatabase } from 'data-kit'

export type DatabaseInstance = DrizzleDatabase

export const getDb = (): DatabaseInstance => getDataSourceManager().getDb()

export const getDbDriver = () => getActiveDriver()
