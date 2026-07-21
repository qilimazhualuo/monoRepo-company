export const success = <T>(data: T) => ({
    code: '200',
    data,
})

export const fail = (code: string, message: string) => ({
    code,
    data: message,
})
