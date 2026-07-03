import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import { drizzle as drizzlePg, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import mysql from 'mysql2/promise'
import postgres from 'postgres'
import { env } from '../config/env'

type DatabaseInstance = MySql2Database | PostgresJsDatabase

export type { DatabaseInstance }

let database: DatabaseInstance | null = null

const createPgDatabaseIfNotExists = async () => {
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

const createMysqlDatabaseIfNotExists = async () => {
    const connection = await mysql.createConnection({
        host: env.dbHost,
        port: env.dbPort,
        user: env.dbUser,
        password: env.dbPassword,
    })

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.dbName}\``)
    console.log(`[db] 已确保 MySQL 数据库存在: ${env.dbName}`)
    await connection.end()
}

const initPgTables = async () => {
    const sql = postgres({
        host: env.dbHost,
        port: env.dbPort,
        user: env.dbUser,
        password: env.dbPassword,
        database: env.dbName,
    })

    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(64) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            nickname VARCHAR(64),
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `

    database = drizzlePg(sql)
}

const initMysqlTables = async () => {
    const pool = mysql.createPool({
        host: env.dbHost,
        port: env.dbPort,
        user: env.dbUser,
        password: env.dbPassword,
        database: env.dbName,
    })

    const connection = await pool.getConnection()
    await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(64) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            nickname VARCHAR(64) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)
    connection.release()

    database = drizzle(pool)
}

export const initDb = async () => {
    if (database) {
        return
    }

    if (env.dbDriver === 'mysql') {
        await createMysqlDatabaseIfNotExists()
        await initMysqlTables()
        return
    }

    await createPgDatabaseIfNotExists()
    await initPgTables()
}

export const getDb = (): DatabaseInstance => {
    if (!database) {
        throw new Error('数据库未初始化，请先调用 initDb()')
    }
    return database
}
