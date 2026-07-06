import { drizzle } from 'drizzle-orm/mysql2'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import mysql from 'mysql2/promise'
import postgres from 'postgres'
import type { DataSourceConfig, DataSourceDriver, QueryResult } from './types'

const createPgDatabaseIfNotExists = async (config: DataSourceConfig) => {
    const adminSql = postgres({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: 'postgres',
    })

    const existsRows = await adminSql`
        SELECT 1 FROM pg_database WHERE datname = ${config.database}
    `

    if (existsRows.length === 0) {
        await adminSql.unsafe(`CREATE DATABASE "${config.database}"`)
        console.log(`[data-kit] 已创建 PostgreSQL 数据库: ${config.database}`)
    }

    await adminSql.end()
}

const createMysqlDatabaseIfNotExists = async (config: DataSourceConfig) => {
    const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
    })

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\``)
    console.log(`[data-kit] 已确保 MySQL 数据库存在: ${config.database}`)
    await connection.end()
}

export const createPgClient = async (config: DataSourceConfig, autoCreateDb = true) => {
    if (autoCreateDb) {
        await createPgDatabaseIfNotExists(config)
    }

    const sql = postgres({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
    })

    return {
        driver: 'pg' as DataSourceDriver,
        drizzle: drizzlePg(sql),
        rawClient: sql,
    }
}

export const createMysqlClient = async (config: DataSourceConfig, autoCreateDb = true) => {
    if (autoCreateDb) {
        await createMysqlDatabaseIfNotExists(config)
    }

    const pool = mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
    })

    return {
        driver: 'mysql' as DataSourceDriver,
        drizzle: drizzle(pool),
        rawClient: pool,
    }
}

export const createDriverClient = async (config: DataSourceConfig, autoCreateDb = true) => {
    if (config.driver === 'mysql') {
        return createMysqlClient(config, autoCreateDb)
    }

    return createPgClient(config, autoCreateDb)
}

export const ensureDatabaseExists = async (config: DataSourceConfig) => {
    if (config.driver === 'mysql') {
        await createMysqlDatabaseIfNotExists(config)
        return
    }

    await createPgDatabaseIfNotExists(config)
}

export const pingDataSource = async (config: DataSourceConfig) => {
    const startedAt = Date.now()

    if (config.driver === 'mysql') {
        const connection = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
        })
        await connection.query('SELECT 1')
        await connection.end()
    } else {
        const sql = postgres({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
        })
        await sql`SELECT 1`
        await sql.end()
    }

    return Date.now() - startedAt
}

export const executeRawQuery = async (
    config: DataSourceConfig,
    sqlText: string,
    params: unknown[] = [],
): Promise<QueryResult> => {
    if (config.driver === 'mysql') {
        const pool = mysql.createPool({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
        })

        const [rows, fields] = await pool.query(sqlText, params)
        await pool.end()

        const rowList = Array.isArray(rows) ? rows as Record<string, unknown>[] : []
        const fieldList = Array.isArray(fields)
            ? fields.map((field) => String((field as { name?: string }).name ?? ''))
            : []

        return {
            rows: rowList,
            rowCount: rowList.length,
            fields: fieldList,
        }
    }

    const sql = postgres({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
    })

    const rows = params.length > 0
        ? await sql.unsafe(sqlText, params as never[])
        : await sql.unsafe(sqlText)

    await sql.end()

    const rowList = Array.isArray(rows) ? rows as Record<string, unknown>[] : []
    const fieldList = rowList[0] ? Object.keys(rowList[0]) : []

    return {
        rows: rowList,
        rowCount: rowList.length,
        fields: fieldList,
    }
}

export const executeRawSql = async (
    config: DataSourceConfig,
    sqlText: string,
) => {
    if (config.driver === 'mysql') {
        const pool = mysql.createPool({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database,
        })
        const connection = await pool.getConnection()
        await connection.query(sqlText)
        connection.release()
        await pool.end()
        return
    }

    const sql = postgres({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
    })
    await sql.unsafe(sqlText)
    await sql.end()
}
