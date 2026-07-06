import bcrypt from 'bcryptjs'
import {
    buildAuthCookie,
    clearAuthCookie,
    createAccessToken,
    createSession,
    readAuthToken,
    readGatewayUser,
    revokeSession,
} from 'auth-kit'
import { eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import { t } from 'elysia'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { getDbDriver } from '../db'
import { env } from '../config/env'
import type { BaseApp } from '../app'
import { usersMysql, usersPg } from 'types'
import { createSliderCaptcha, verifySliderCaptcha } from '../services/captcha'
import { decryptRsaPassword, getPublicKeyPem } from '../services/crypto'
import { toPublicUser } from '../utils/auth'

const success = <T>(data: T) => ({
    code: '200',
    data,
})

const fail = (code: string, message: string) => ({
    code,
    data: message,
})

export const registerAuthRoutes = <T extends BaseApp>(app: T) => app
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

            const rows = getDbDriver() === 'mysql'
                ? await (db as MySql2Database)
                    .select()
                    .from(usersMysql)
                    .where(eq(usersMysql.username, body.username))
                    .limit(1)
                : await (db as PostgresJsDatabase)
                    .select()
                    .from(usersPg)
                    .where(eq(usersPg.username, body.username))
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

            const accessToken = createAccessToken(
                env.authConfig,
                userRecord.id,
                userRecord.username,
            )
            await createSession(env.authConfig, accessToken, {
                userId: userRecord.id,
                username: userRecord.username,
            })
            set.headers['set-cookie'] = buildAuthCookie(env.authConfig, accessToken)

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
        const gatewayUser = readGatewayUser(request.headers)
        if (!gatewayUser) {
            set.status = 401
            return fail('401', '未登录')
        }

        const rows = getDbDriver() === 'mysql'
            ? await (db as MySql2Database)
                .select()
                .from(usersMysql)
                .where(eq(usersMysql.id, gatewayUser.userId))
                .limit(1)
            : await (db as PostgresJsDatabase)
                .select()
                .from(usersPg)
                .where(eq(usersPg.id, gatewayUser.userId))
                .limit(1)

        const userRecord = rows[0]
        if (!userRecord) {
            set.status = 401
            return fail('401', '用户不存在')
        }

        return success(toPublicUser(userRecord))
    })
    .delete('/api/auth/logout', async ({ request, set }) => {
        const token = readAuthToken(env.authConfig, request.headers.get('cookie'))
        if (token) {
            await revokeSession(env.authConfig, token)
        }

        set.headers['set-cookie'] = clearAuthCookie(env.authConfig)
        return success(true)
    })
