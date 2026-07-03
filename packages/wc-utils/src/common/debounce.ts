/**
 * 防抖
 */
export const debounce = <Args extends unknown[]>(
    callback: (...args: Args) => void,
    delayMs = 300,
): ((...args: Args) => void) => {
    let timerId: ReturnType<typeof setTimeout> | null = null

    return (...args: Args) => {
        if (timerId !== null) {
            clearTimeout(timerId)
        }

        timerId = setTimeout(() => {
            callback(...args)
            timerId = null
        }, delayMs)
    }
}
