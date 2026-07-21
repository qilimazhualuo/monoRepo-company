import postgres from 'postgres'
import { env } from '../config/env'

let sqlClient: ReturnType<typeof postgres> | null = null

const createDatabaseIfNotExists = async () => {
    const adminSql = postgres({
        host: env.dbHost,
        port: env.dbPort,
        user: env.dbUser,
        password: env.dbPassword,
        database: 'postgres',
    })

    const existsRows = await adminSql`
        SELECT 1 FROM pg_database WHERE datname = ${env.dbName}
    `

    if (existsRows.length === 0) {
        await adminSql.unsafe(`CREATE DATABASE "${env.dbName}"`)
        console.log(`[db] 已创建 PostgreSQL 数据库: ${env.dbName}`)
    }

    await adminSql.end()
}

const ensurePostgisAndRoadsTable = async (sql: ReturnType<typeof postgres>) => {
    await sql`CREATE EXTENSION IF NOT EXISTS postgis`

    const tableName = env.roadTable.replace(/[^a-zA-Z0-9_]/g, '')
    const geomColumn = env.roadGeomColumn.replace(/[^a-zA-Z0-9_]/g, '')
    const idColumn = env.roadIdColumn.replace(/[^a-zA-Z0-9_]/g, '')

    await sql.unsafe(`
        CREATE TABLE IF NOT EXISTS "${tableName}" (
            "${idColumn}" BIGSERIAL PRIMARY KEY,
            name TEXT,
            "${geomColumn}" geometry(Geometry, 4326) NOT NULL
        )
    `)

    await sql.unsafe(`
        CREATE INDEX IF NOT EXISTS "${tableName}_${geomColumn}_idx"
        ON "${tableName}" USING GIST ("${geomColumn}")
    `)
}

export const initDb = async () => {
    if (sqlClient) {
        return sqlClient
    }

    await createDatabaseIfNotExists()

    sqlClient = postgres({
        host: env.dbHost,
        port: env.dbPort,
        user: env.dbUser,
        password: env.dbPassword,
        database: env.dbName,
        max: 10,
    })

    await ensurePostgisAndRoadsTable(sqlClient)
    return sqlClient
}

export const getSql = () => {
    if (!sqlClient) {
        throw new Error('数据库未初始化，请先调用 initDb()')
    }
    return sqlClient
}
