import { Elysia } from 'elysia'
import { existsSync, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'

const mimeTypeMap: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.map': 'application/json',
}

const resolveMimeType = (filePath: string) => {
    return mimeTypeMap[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

const isPathInsideRoot = (targetPath: string, rootPath: string) => {
    const normalizedTarget = resolve(targetPath)
    const normalizedRoot = resolve(rootPath)
    return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}${sep}`)
}

const resolveStaticFile = (publicDir: string, pathname: string) => {
    const decodedPath = decodeURIComponent(pathname)
    const relativePath = decodedPath === '/' ? '/index.html' : decodedPath
    const requestedFile = resolve(publicDir, `.${relativePath}`)

    if (!isPathInsideRoot(requestedFile, publicDir)) {
        return null
    }

    if (existsSync(requestedFile) && statSync(requestedFile).isFile()) {
        return requestedFile
    }

    if (existsSync(requestedFile) && statSync(requestedFile).isDirectory()) {
        const directoryIndex = join(requestedFile, 'index.html')
        if (existsSync(directoryIndex)) {
            return directoryIndex
        }
    }

    return null
}

const resolveSpaFallback = (publicDir: string, pathname: string) => {
    const microAppPrefixes = ['/sub-app']
    const matchedMicroApp = microAppPrefixes.find((prefix) => {
        return pathname === prefix || pathname.startsWith(`${prefix}/`)
    })

    if (matchedMicroApp) {
        const microAppIndex = resolve(publicDir, `${matchedMicroApp.slice(1)}/index.html`)
        if (existsSync(microAppIndex)) {
            return microAppIndex
        }
    }

    const rootIndex = resolve(publicDir, 'index.html')
    if (existsSync(rootIndex) && !extname(pathname)) {
        return rootIndex
    }

    return null
}

export const createPublicStaticPlugin = (publicDir: string) => {
    const absolutePublicDir = resolve(publicDir)

    return new Elysia({ name: 'public-static' })
        .onBeforeHandle(({ request, set }) => {
            if (request.method !== 'GET' && request.method !== 'HEAD') {
                set.status = 405
                return 'Method Not Allowed'
            }
        })
        .get('/*', ({ request, set }) => {
            const { pathname } = new URL(request.url)

            if (pathname.startsWith('/api/')) {
                return
            }

            const staticFile = resolveStaticFile(absolutePublicDir, pathname)
                ?? resolveSpaFallback(absolutePublicDir, pathname)

            if (!staticFile) {
                set.status = 404
                return 'Not Found'
            }

            set.headers['content-type'] = resolveMimeType(staticFile)
            return Bun.file(staticFile)
        })
}
