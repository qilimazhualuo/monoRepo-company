/**
 * 格式化日期
 */
export const formatDate = (
    dateInput: Date | string | number,
    pattern = 'YYYY-MM-DD HH:mm:ss',
): string => {
    const dateValue = dateInput instanceof Date ? dateInput : new Date(dateInput)

    if (Number.isNaN(dateValue.getTime())) {
        return ''
    }

    const padZero = (num: number) => String(num).padStart(2, '0')

    const tokens: Record<string, string> = {
        YYYY: String(dateValue.getFullYear()),
        MM: padZero(dateValue.getMonth() + 1),
        DD: padZero(dateValue.getDate()),
        HH: padZero(dateValue.getHours()),
        mm: padZero(dateValue.getMinutes()),
        ss: padZero(dateValue.getSeconds()),
    }

    return pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => tokens[token] ?? token)
}
