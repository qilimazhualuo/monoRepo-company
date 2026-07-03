/**
 * 判断值是否为空（null / undefined / 空字符串 / 空数组 / 空对象）
 */
export const isEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) {
        return true
    }

    if (typeof value === 'string') {
        return value.trim().length === 0
    }

    if (Array.isArray(value)) {
        return value.length === 0
    }

    if (typeof value === 'object') {
        return Object.keys(value).length === 0
    }

    return false
}
