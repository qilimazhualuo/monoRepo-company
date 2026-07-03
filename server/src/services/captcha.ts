import { randomInt, randomUUID } from 'node:crypto'

interface CaptchaRecord {
    correctXRatio: number
    correctYRatio: number
    blockWidthRatio: number
    blockHeightRatio: number
    expiredAt: number
}

const captchaStore = new Map<string, CaptchaRecord>()
const CAPTCHA_TTL_MS = 5 * 60 * 1000

/** SVG 生成用内部尺寸，对外只暴露比例 */
const CANVAS_WIDTH = 320
const CANVAS_HEIGHT = 160
const BLOCK_WIDTH = 50
const BLOCK_HEIGHT = 50

const ASPECT_RATIO = CANVAS_WIDTH / CANVAS_HEIGHT
const BLOCK_WIDTH_RATIO = BLOCK_WIDTH / CANVAS_WIDTH
const BLOCK_HEIGHT_RATIO = BLOCK_HEIGHT / CANVAS_HEIGHT

/** 尺寸比例容差（浮点误差） */
const TOLERANCE_SIZE_RATIO = 0.001

/** 位置按比例容差（约等于画布宽/高 8px） */
const TOLERANCE_X_RATIO = 8 / CANVAS_WIDTH
const TOLERANCE_Y_RATIO = 8 / CANVAS_HEIGHT

const buildSvgDataUrl = (svgContent: string) => {
    return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`
}

const createBackgroundSvg = (holeX: number, holeY: number) => {
    const gradientId = `bg-${randomUUID()}`
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
            <defs>
                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#6ea8fe"/>
                    <stop offset="100%" stop-color="#1f4f9c"/>
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#${gradientId})"/>
            <rect x="${holeX}" y="${holeY}" width="${BLOCK_WIDTH}" height="${BLOCK_HEIGHT}" fill="rgba(0,0,0,0.25)" rx="6"/>
            <circle cx="60" cy="40" r="18" fill="rgba(255,255,255,0.25)"/>
            <circle cx="250" cy="120" r="24" fill="rgba(255,255,255,0.18)"/>
        </svg>
    `
}

const createBlockSvg = () => {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${BLOCK_WIDTH}" height="${BLOCK_HEIGHT}">
            <rect width="100%" height="100%" fill="#ffffff" stroke="#1677ff" stroke-width="2" rx="6"/>
            <path d="M12 25 H38" stroke="#1677ff" stroke-width="3" stroke-linecap="round"/>
            <path d="M12 32 H30" stroke="#69b1ff" stroke-width="3" stroke-linecap="round"/>
        </svg>
    `
}

const cleanupExpiredCaptcha = () => {
    const now = Date.now()
    captchaStore.forEach((record, key) => {
        if (record.expiredAt <= now) {
            captchaStore.delete(key)
        }
    })
}

export const createSliderCaptcha = () => {
    cleanupExpiredCaptcha()

    const guid = randomUUID()
    const holeX = randomInt(10, CANVAS_WIDTH - BLOCK_WIDTH - 10)
    const holeY = randomInt(10, CANVAS_HEIGHT - BLOCK_HEIGHT - 10)

    captchaStore.set(guid, {
        correctXRatio: holeX / CANVAS_WIDTH,
        correctYRatio: holeY / CANVAS_HEIGHT,
        blockWidthRatio: BLOCK_WIDTH_RATIO,
        blockHeightRatio: BLOCK_HEIGHT_RATIO,
        expiredAt: Date.now() + CAPTCHA_TTL_MS,
    })

    return {
        guid,
        aspectRatio: ASPECT_RATIO,
        canvasSrc: buildSvgDataUrl(createBackgroundSvg(holeX, holeY)),
        blockSrc: buildSvgDataUrl(createBlockSvg()),
        blockWidthRatio: BLOCK_WIDTH_RATIO,
        blockHeightRatio: BLOCK_HEIGHT_RATIO,
    }
}

const isRatioClose = (expectedRatio: number, actualRatio: number, toleranceRatio: number) => {
    return Math.abs(expectedRatio - actualRatio) <= toleranceRatio
}

export const verifySliderCaptcha = (
    guid: string,
    blockXRatio: number,
    blockYRatio: number,
    blockWidthRatio: number,
    blockHeightRatio: number,
) => {
    const record = captchaStore.get(guid)
    captchaStore.delete(guid)

    if (!record) {
        return false
    }

    if (record.expiredAt < Date.now()) {
        return false
    }

    const isXValid = isRatioClose(record.correctXRatio, blockXRatio, TOLERANCE_X_RATIO)
    const isYValid = isRatioClose(record.correctYRatio, blockYRatio, TOLERANCE_Y_RATIO)
    const isWidthValid = isRatioClose(record.blockWidthRatio, blockWidthRatio, TOLERANCE_SIZE_RATIO)
    const isHeightValid = isRatioClose(record.blockHeightRatio, blockHeightRatio, TOLERANCE_SIZE_RATIO)

    return isXValid && isYValid && isWidthValid && isHeightValid
}
