import { Elysia, t } from 'elysia'
import { env } from '../config/env'
import { initDatabase } from '../db'
import {
    findUserById,
    findUserByUsername,
    toPublicUser,
    verifyPassword,
} from '../models/user'
import { createSliderCaptcha, verifySliderCaptcha } from '../services/captcha'
import { decryptRsaPassword, getPublicKeyPem } from '../services/crypto'
import { createAccessToken, verifyAccessToken } from '../services/token'

const success = <T>(data: T) => ({
    code: '200',
    data,
})

const fail = (code: string, message: string) => ({
    code,
    data: message,
})

const parseCookies = (cookieHeader?: string | null) => {
    if (!cookieHeader) {
        return {} as Record<string, string>
    }

    return cookieHeader.split(';').reduce<Record<string, string>>((cookieMap, item) => {
        const splitIndex = item.indexOf('=')
        if (splitIndex === -1) {
            return cookieMap
        }

        const key = item.slice(0, splitIndex).trim()
        const value = decodeURIComponent(item.slice(splitIndex + 1).trim())
        cookieMap[key] = value
        return cookieMap
    }, {})
}

const buildAuthCookie = (token: string, maxAge = env.cookieMaxAge) => {
    return `${env.cookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

const clearAuthCookie = () => {
    return `${env.cookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}

export const authRoutes = new Elysia({ prefix: '/api/auth' })
    .get('/public-key', () => {
        return success({
            publicKeyPem: getPublicKeyPem(),
        })
    })
    .get('/getImage', () => {
        return success(createSliderCaptcha())
    })
    .post(
        '/login',
        async ({ body, set }) => {
            await initDatabase()

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

            const userRecord = await findUserByUsername(body.username)
            if (!userRecord) {
                set.status = 401
                return fail('500', '用户名或密码错误')
            }

            const isPasswordValid = await verifyPassword(plainPassword, userRecord.passwordHash)
            if (!isPasswordValid) {
                set.status = 401
                return fail('500', '用户名或密码错误')
            }

            const accessToken = createAccessToken(userRecord.id, userRecord.username)
            set.headers['set-cookie'] = buildAuthCookie(accessToken)

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
    .get('/me', async ({ request, set }) => {
        const cookieMap = parseCookies(request.headers.get('cookie'))
        const token = cookieMap[env.cookieName]

        if (!token) {
            set.status = 401
            return fail('401', '未登录')
        }

        const payload = verifyAccessToken(token)
        if (!payload) {
            set.status = 401
            return fail('401', '登录已过期')
        }

        await initDatabase()
        const userRecord = await findUserById(payload.userId)
        if (!userRecord) {
            set.status = 401
            return fail('401', '用户不存在')
        }

        return success(toPublicUser(userRecord))
    })
    .delete('/logout', ({ set }) => {
        set.headers['set-cookie'] = clearAuthCookie()
        return success(true)
    })
