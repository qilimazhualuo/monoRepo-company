import { createHttpClient, encryptWithRsa } from 'wc-utils'
import type { SliderCaptchaImage } from 'wc-ui'

export interface LoginPayload {
    username: string
    password: string
    vCodeKey: string
    blockX: number
    blockY: number
    blockWidthRatio: number
    blockHeightRatio: number
}

export interface PublicUser {
    id: number
    username: string
    nickname: string | null
}

const httpClient = createHttpClient({ baseUrl: '/api' })

export const fetchPublicKey = async () => {
    const result = await httpClient.get<{ publicKeyPem: string }>('/auth/public-key')
    return result.data.publicKeyPem
}

export const fetchSliderCaptcha = async (): Promise<SliderCaptchaImage> => {
    const result = await httpClient.get<SliderCaptchaImage>('/auth/getImage')
    return result.data
}

export const login = async (payload: LoginPayload, publicKeyPem: string) => {
    const encryptedPassword = await encryptWithRsa(payload.password, publicKeyPem)
    if (!encryptedPassword) {
        throw {
            code: '400',
            data: '密码加密失败，请刷新页面重试',
        }
    }

    const captchaRatioFields = [
        payload.blockX,
        payload.blockY,
        payload.blockWidthRatio,
        payload.blockHeightRatio,
    ]
    const hasInvalidCaptchaRatio = captchaRatioFields.some(
        (fieldValue) => fieldValue === undefined || fieldValue === null || Number.isNaN(Number(fieldValue)),
    )
    const isCaptchaKeyInvalid = !payload.vCodeKey
    if (hasInvalidCaptchaRatio || isCaptchaKeyInvalid) {
        throw {
            code: '400',
            data: '验证码参数不完整，请重新滑动验证',
        }
    }

    return httpClient.post<PublicUser>('/auth/login', {
        username: payload.username,
        encryptedPassword,
        checkType: 'slider',
        blockX: payload.blockX,
        blockY: payload.blockY,
        blockWidthRatio: payload.blockWidthRatio,
        blockHeightRatio: payload.blockHeightRatio,
        guid: payload.vCodeKey,
    })
}

export const fetchCurrentUser = async () => {
    return httpClient.get<PublicUser>('/auth/me')
}

export const logout = async () => {
    return httpClient.delete<boolean>('/auth/logout')
}
