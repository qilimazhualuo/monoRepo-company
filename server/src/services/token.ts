import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env'

interface TokenPayload {
    userId: number
    username: string
    exp: number
}

const encodeBase64Url = (value: string) => {
    return Buffer.from(value).toString('base64url')
}

const decodeBase64Url = (value: string) => {
    return Buffer.from(value, 'base64url').toString('utf-8')
}

const signContent = (content: string) => {
    return createHmac('sha256', env.jwtSecret).update(content).digest('base64url')
}

export const createAccessToken = (userId: number, username: string) => {
    const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload: TokenPayload = {
        userId,
        username,
        exp: Date.now() + env.cookieMaxAge * 1000,
    }
    const body = encodeBase64Url(JSON.stringify(payload))
    const signature = signContent(`${header}.${body}`)
    return `${header}.${body}.${signature}`
}

export const verifyAccessToken = (token: string): TokenPayload | null => {
    const parts = token.split('.')
    if (parts.length !== 3) {
        return null
    }

    const [header, body, signature] = parts
    const expectedSignature = signContent(`${header}.${body}`)

    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (
        signatureBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
        return null
    }

    const payload = JSON.parse(decodeBase64Url(body)) as TokenPayload

    if (payload.exp < Date.now()) {
        return null
    }

    return payload
}
