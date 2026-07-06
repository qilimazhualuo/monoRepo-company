export const success = <T>(data: T) => ({
    code: '200',
    data,
})

export const fail = (code: string, message: string) => ({
    code,
    data: message,
})

export const maskPassword = (password: string) => {
    if (!password) {
        return ''
    }

    if (password.length <= 2) {
        return '*'.repeat(password.length)
    }

    return `${password.slice(0, 1)}${'*'.repeat(Math.min(password.length - 2, 8))}${password.slice(-1)}`
}
