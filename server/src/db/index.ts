import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import { drizzle as drizzlePg, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import mysql from 'mysql2/promise'
import postgres from 'postgres'
import { env } from '../config/env'
import { usersMysql, usersPg } from './schema'

let pgDatabase: PostgresJsDatabase | null = null
let mysqlDatabase: MySql2Database | null = null

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

    pgDatabase = drizzlePg(sql)
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

    mysqlDatabase = drizzle(pool)
}

export const initDatabase = async () => {
    if (env.dbDriver === 'mysql') {
        if (!mysqlDatabase) {
            await createMysqlDatabaseIfNotExists()
            await initMysqlTables()
        }
        return
    }

    if (!pgDatabase) {
        await createPgDatabaseIfNotExists()
        await initPgTables()
    }
}

export const getPgDatabase = () => {
    if (!pgDatabase) {
        throw new Error('PostgreSQL 数据库未初始化')
    }
    return pgDatabase
}

export const getMysqlDatabase = () => {
    if (!mysqlDatabase) {
        throw new Error('MySQL 数据库未初始化')
    }
    return mysqlDatabase
}

export { usersMysql, usersPg }
