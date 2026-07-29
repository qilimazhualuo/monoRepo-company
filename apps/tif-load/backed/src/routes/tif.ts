import { Elysia, t } from 'elysia'
import { buildHeightmap, getFile, listFiles, saveUpload } from '../services/tifStore'

const ok = <T>(data: T) => ({ code: '200', data })
const fail = (message: string, status = 400) => {
    const error = new Error(message) as Error & { status: number }
    error.status = status
    throw error
}

export const tifRoutes = new Elysia({ prefix: '/api' })
    .get('/health', () => ok({ status: 'ok' }))
    .get('/files', () => ok(listFiles().map(({ filePath: _filePath, ...rest }) => rest)))
    .get('/files/:id', ({ params }) => {
        const record = getFile(params.id)
        if (!record) {
            fail('文件不存在', 404)
        }
        const { filePath: _filePath, ...rest } = record!
        return ok(rest)
    })
    .post(
        '/files/upload',
        async ({ body }) => {
            const file = body.file
            if (!file) {
                fail('缺少 file')
            }
            const record = await saveUpload(file)
            const { filePath: _filePath, ...rest } = record
            return ok(rest)
        },
        {
            body: t.Object({
                file: t.File(),
            }),
        },
    )
    .get('/files/:id/heightmap', async ({ params }) => {
        try {
            const payload = await buildHeightmap(params.id)
            return ok(payload.meta)
        } catch (error) {
            fail(error instanceof Error ? error.message : 'heightmap 失败', 400)
        }
    })
    .get('/files/:id/heightmap.bin', async ({ params, set }) => {
        try {
            const payload = await buildHeightmap(params.id)
            set.headers['Content-Type'] = 'application/octet-stream'
            return payload.bin
        } catch (error) {
            fail(error instanceof Error ? error.message : 'heightmap 失败', 400)
        }
    })
