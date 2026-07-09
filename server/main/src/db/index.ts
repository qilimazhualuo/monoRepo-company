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

const migratePgUsers = async (sql: ReturnType<typeof postgres>) => {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id INTEGER`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(128)`
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS status SMALLINT NOT NULL DEFAULT 1`
}

const migrateMysqlColumn = async (
    connection: mysql.PoolConnection,
    tableName: string,
    columnName: string,
    columnDefinition: string,
) => {
    const [rows] = await connection.query(
        `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [env.dbName, tableName, columnName],
    ) as [{ count: number }[], unknown]

    if (rows[0]?.count === 0) {
        await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${columnDefinition}`)
    }
}

const migrateMysqlUsers = async (connection: mysql.PoolConnection) => {
    await migrateMysqlColumn(connection, 'users', 'org_id', 'org_id INT NULL')
    await migrateMysqlColumn(connection, 'users', 'phone', 'phone VARCHAR(20) NULL')
    await migrateMysqlColumn(connection, 'users', 'email', 'email VARCHAR(128) NULL')
    await migrateMysqlColumn(connection, 'users', 'status', 'status INT NOT NULL DEFAULT 1')
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
            org_id INTEGER,
            phone VARCHAR(20),
            email VARCHAR(128),
            status SMALLINT NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `
    await migratePgUsers(sql)

    await sql`
        CREATE TABLE IF NOT EXISTS organizations (
            id SERIAL PRIMARY KEY,
            parent_id INTEGER,
            name VARCHAR(128) NOT NULL,
            code VARCHAR(64) NOT NULL UNIQUE,
            sort INTEGER NOT NULL DEFAULT 0,
            status SMALLINT NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `

    await sql`
        CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            code VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(64) NOT NULL,
            description TEXT,
            status SMALLINT NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `

    await sql`
        CREATE TABLE IF NOT EXISTS menus (
            id SERIAL PRIMARY KEY,
            parent_id INTEGER,
            name VARCHAR(64) NOT NULL,
            type VARCHAR(16) NOT NULL DEFAULT 'menu',
            path VARCHAR(255),
            permission VARCHAR(128),
            icon VARCHAR(64),
            sort INTEGER NOT NULL DEFAULT 0,
            status SMALLINT NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `

    await sql`
        CREATE TABLE IF NOT EXISTS user_roles (
            user_id INTEGER NOT NULL,
            role_id INTEGER NOT NULL,
            PRIMARY KEY (user_id, role_id)
        )
    `

    await sql`
        CREATE TABLE IF NOT EXISTS role_menus (
            role_id INTEGER NOT NULL,
            menu_id INTEGER NOT NULL,
            PRIMARY KEY (role_id, menu_id)
        )
    `

    await sql`
        CREATE TABLE IF NOT EXISTS dict_types (
            id SERIAL PRIMARY KEY,
            name VARCHAR(64) NOT NULL,
            type VARCHAR(64) NOT NULL UNIQUE,
            status SMALLINT NOT NULL DEFAULT 1,
            remark TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `

    await sql`
        CREATE TABLE IF NOT EXISTS dict_data (
            id SERIAL PRIMARY KEY,
            dict_type VARCHAR(64) NOT NULL,
            label VARCHAR(128) NOT NULL,
            value VARCHAR(128) NOT NULL,
            sort INTEGER NOT NULL DEFAULT 0,
            status SMALLINT NOT NULL DEFAULT 1,
            remark TEXT,
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
            org_id INT NULL,
            phone VARCHAR(20) NULL,
            email VARCHAR(128) NULL,
            status INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)
    await migrateMysqlUsers(connection)

    await connection.query(`
        CREATE TABLE IF NOT EXISTS organizations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            parent_id INT NULL,
            name VARCHAR(128) NOT NULL,
            code VARCHAR(64) NOT NULL UNIQUE,
            sort INT NOT NULL DEFAULT 0,
            status INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await connection.query(`
        CREATE TABLE IF NOT EXISTS roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(64) NOT NULL UNIQUE,
            name VARCHAR(64) NOT NULL,
            description TEXT NULL,
            status INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await connection.query(`
        CREATE TABLE IF NOT EXISTS menus (
            id INT AUTO_INCREMENT PRIMARY KEY,
            parent_id INT NULL,
            name VARCHAR(64) NOT NULL,
            type VARCHAR(16) NOT NULL DEFAULT 'menu',
            path VARCHAR(255) NULL,
            permission VARCHAR(128) NULL,
            icon VARCHAR(64) NULL,
            sort INT NOT NULL DEFAULT 0,
            status INT NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await connection.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
            user_id INT NOT NULL,
            role_id INT NOT NULL,
            PRIMARY KEY (user_id, role_id)
        )
    `)

    await connection.query(`
        CREATE TABLE IF NOT EXISTS role_menus (
            role_id INT NOT NULL,
            menu_id INT NOT NULL,
            PRIMARY KEY (role_id, menu_id)
        )
    `)

    await connection.query(`
        CREATE TABLE IF NOT EXISTS dict_types (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(64) NOT NULL,
            type VARCHAR(64) NOT NULL UNIQUE,
            status INT NOT NULL DEFAULT 1,
            remark VARCHAR(255) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)

    await connection.query(`
        CREATE TABLE IF NOT EXISTS dict_data (
            id INT AUTO_INCREMENT PRIMARY KEY,
            dict_type VARCHAR(64) NOT NULL,
            label VARCHAR(128) NOT NULL,
            value VARCHAR(128) NOT NULL,
            sort INT NOT NULL DEFAULT 0,
            status INT NOT NULL DEFAULT 1,
            remark VARCHAR(255) NULL,
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
