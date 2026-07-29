import pg from 'pg'

const pool = new pg.Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '123zhangbei',
    database: 'navigation',
})

export const query = (text, params) => pool.query(text, params)

export const initDb = async () => {
    await query('CREATE EXTENSION IF NOT EXISTS postgis')
    console.log('[db] PostGIS 扩展已确保存在')
}
