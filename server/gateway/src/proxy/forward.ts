import { resolveAuthUser } from 'auth-kit'
import { env } from '../config/env'
import { fail, isPublicPath } from '../utils/route'

const hopByHopHeaders = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
    'host',
    'content-length',
])

const buildForwardHeaders = (request: Request, userId?: number, username?: string) => {
    const headers = new Headers()

    request.headers.forEach((value, key) => {
        if (hopByHopHeaders.has(key.toLowerCase())) {
            return
        }
        headers.set(key, value)
    })

    if (userId !== undefined && username) {
        headers.set('x-user-id', String(userId))
        headers.set('x-username', username)
        headers.set('x-gateway', 'mono-repo')
    }

    return headers
}

export const forwardRequest = async (
    request: Request,
    upstreamBaseUrl: string,
    userId?: number,
    username?: string,
) => {
    const requestUrl = new URL(request.url)
    const targetUrl = `${upstreamBaseUrl}${requestUrl.pathname}${requestUrl.search}`
    const method = request.method.toUpperCase()
    const hasBody = method !== 'GET' && method !== 'HEAD'

    const upstreamResponse = await fetch(targetUrl, {
        method,
        headers: buildForwardHeaders(request, userId, username),
        body: hasBody ? request.body : undefined,
        redirect: 'manual',
    })

    const responseHeaders = new Headers()
    upstreamResponse.headers.forEach((value, key) => {
        if (hopByHopHeaders.has(key.toLowerCase())) {
            return
        }
        responseHeaders.set(key, value)
    })

    return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
    })
}

export const handleGatewayRequest = async (request: Request) => {
    const requestUrl = new URL(request.url)
    const pathname = requestUrl.pathname

    if (pathname === '/health') {
        return Response.json({
            code: '200',
            data: 'ok',
        })
    }

    const upstreamBaseUrl = pathname.startsWith('/api/auth')
        ? env.authUpstream
        : pathname.startsWith('/api/basic')
            ? env.basicUpstream
            : null

    if (!upstreamBaseUrl) {
        return Response.json(fail('404', '接口不存在'), { status: 404 })
    }

    if (isPublicPath(pathname)) {
        return forwardRequest(request, upstreamBaseUrl)
    }

    const authUser = await resolveAuthUser(env.authConfig, request.headers.get('cookie'))
    if (!authUser) {
        return Response.json(fail('401', '未登录或登录已过期'), { status: 401 })
    }

    return forwardRequest(
        request,
        upstreamBaseUrl,
        authUser.userId,
        authUser.username,
    )
}
