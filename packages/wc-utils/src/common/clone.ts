export const clone = <T>(obj: T): T => {
    if (obj === null || typeof obj !== 'object') {
        return obj
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as T
    }

    if (obj instanceof RegExp) {
        return new RegExp(obj) as T
    }

    if (typeof obj === 'function') {
        return obj
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => clone(item)) as T
    }

    const newObj = Object.create(Object.getPrototypeOf(obj)) as T
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            (newObj as Record<string, unknown>)[key] = clone((obj as Record<string, unknown>)[key])
        }
    }

    return newObj
}
