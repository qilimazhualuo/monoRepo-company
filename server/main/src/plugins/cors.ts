import { Elysia } from 'elysia'

export const corsPlugin = new Elysia({ name: 'cors' })
    .onBeforeHandle(({ request, set }) => {
        const origin = request.headers.get('origin')
        set.headers['Access-Control-Allow-Origin'] = origin ?? '*'
        set.headers['Access-Control-Allow-Credentials'] = 'true'
        set.headers['Access-Control-Allow-Methods'] = 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS'
        set.headers['Access-Control-Allow-Headers'] = request.headers.get('Access-Control-Request-Headers') ?? '*'
        set.headers['Access-Control-Max-Age'] = '86400'
    })
    .options('/*', ({ set }) => {
        set.status = 204
        return ''
    })
