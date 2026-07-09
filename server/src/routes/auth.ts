import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import { Elysia, t } from 'elysia'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { env } from '../config/env'
import { setup } from '../plugins/setup'
import { getUsersTable, isMysqlDriver } from '../models'
import { createSliderCaptcha, verifySliderCaptcha } from '../services/captcha'
import { decryptRsaPassword, getPublicKeyPem } from '../services/crypto'
import { getUserMenus, getUserPermissions, getRolesByUserId } from '../services/rbac'
import { createSession, createSessionToken, getSession, revokeSession } from '../services/session'
import { buildAuthCookie, clearAuthCookie, parseCookies, toPublicUser } from '../utils/auth'
import { fail, success } from '../utils/response'

export const authRoutes = new Elysia({ name: 'auth' })
    .use(setup)
    .get('/api/auth/public-key', () => {
        return success({
            publicKeyPem: getPublicKeyPem(),
        })
    })
    .get('/api/auth/getImage', () => {
        return success(createSliderCaptcha())
    })
    .post(
        '/api/auth/login',
        async ({ body, set, db }) => {
            if (body.checkType !== 'slider') {
                set.status = 400
                return fail('400', '仅支持滑动验证码登录')
            }

            const isCaptchaValid = verifySliderCaptcha(
                body.guid,
                Number(body.blockX),
                Number(body.blockY),
                Number(body.blockWidthRatio),
                Number(body.blockHeightRatio),
            )
            if (!isCaptchaValid) {
                set.status = 400
                return fail('499', '滑动验证失败，请重试')
            }

            let plainPassword = ''
            try {
                plainPassword = decryptRsaPassword(body.encryptedPassword)
            } catch {
                set.status = 400
                return fail('400', '密码解密失败')
            }

            const usersTable = getUsersTable()
            const rows = isMysqlDriver()
                ? await (db as MySql2Database)
                    .select()
                    .from(usersTable)
                    .where(eq(usersTable.username, body.username))
                    .limit(1)
                : await (db as PostgresJsDatabase)
                    .select()
                    .from(usersTable)
                    .where(eq(usersTable.username, body.username))
                    .limit(1)

            const userRecord = rows[0]
            if (!userRecord) {
                set.status = 401
                return fail('500', '用户名或密码错误')
            }

            const isPasswordValid = await bcrypt.compare(plainPassword, userRecord.passwordHash)
            if (!isPasswordValid) {
                set.status = 401
                return fail('500', '用户名或密码错误')
            }

            const sessionToken = createSessionToken()
            await createSession(sessionToken, {
                userId: userRecord.id,
                username: userRecord.username,
            })
            set.headers['set-cookie'] = buildAuthCookie(sessionToken)

            return success(toPublicUser(userRecord))
        },
        {
            body: t.Object({
                username: t.String(),
                encryptedPassword: t.String(),
                checkType: t.String(),
                blockX: t.Union([t.Number(), t.String()]),
                blockY: t.Union([t.Number(), t.String()]),
                blockWidthRatio: t.Union([t.Number(), t.String()]),
                blockHeightRatio: t.Union([t.Number(), t.String()]),
                guid: t.String(),
            }),
        },
    )
    .get('/api/auth/me', async ({ request, set, db }) => {
        const cookieMap = parseCookies(request.headers.get('cookie'))
        const token = cookieMap[env.cookieName]

        if (!token) {
            set.status = 401
            return fail('401', '未登录')
        }

        const session = await getSession(token)
        if (!session) {
            set.status = 401
            return fail('401', '登录已过期')
        }

        const usersTable = getUsersTable()
        const rows = isMysqlDriver()
            ? await (db as MySql2Database)
                .select()
                .from(usersTable)
                .where(eq(usersTable.id, session.userId))
                .limit(1)
            : await (db as PostgresJsDatabase)
                .select()
                .from(usersTable)
                .where(eq(usersTable.id, session.userId))
                .limit(1)

        const userRecord = rows[0]
        if (!userRecord) {
            set.status = 401
            return fail('401', '用户不存在')
        }

        const roles = await getRolesByUserId(db, userRecord.id)
        const permissions = await getUserPermissions(db, userRecord.id)

        return success({
            ...toPublicUser(userRecord),
            roles: roles.map((role) => ({ id: role.id, code: role.code, name: role.name })),
            permissions,
        })
    })
    .get('/api/auth/menus', async ({ request, set, db }) => {
        const cookieMap = parseCookies(request.headers.get('cookie'))
        const token = cookieMap[env.cookieName]

        if (!token) {
            set.status = 401
            return fail('401', '未登录')
        }

        const session = await getSession(token)
        if (!session) {
            set.status = 401
            return fail('401', '登录已过期')
        }

        const menus = await getUserMenus(db, session.userId)
        return success(menus)
    })
    .delete('/api/auth/logout', async ({ request, set }) => {
        const cookieMap = parseCookies(request.headers.get('cookie'))
        const token = cookieMap[env.cookieName]

        if (token) {
            await revokeSession(token)
        }

        set.headers['set-cookie'] = clearAuthCookie()
        return success(true)
    })
