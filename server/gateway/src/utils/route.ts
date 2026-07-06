export const fail = (code: string, message: string) => ({
    code,
    data: message,
})

export const PUBLIC_AUTH_PATHS = new Set([
    '/api/auth/public-key',
    '/api/auth/getImage',
    '/api/auth/login',
])

export const isPublicPath = (pathname: string) => PUBLIC_AUTH_PATHS.has(pathname)

export const resolveUpstream = (pathname: string, authUpstream: string, basicUpstream: string) => {
    if (pathname.startsWith('/api/auth')) {
        return authUpstream
    }

    if (pathname.startsWith('/api/basic')) {
        return basicUpstream
    }

    return null
}
