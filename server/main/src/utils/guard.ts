import type { DatabaseInstance } from '../db'
import { resolveAuth, type AuthContext } from '../services/auth-context'
import { fail } from './response'

export const requireAuth = async (
    request: Request,
    database: DatabaseInstance,
    set: { status?: number | string },
): Promise<AuthContext | ReturnType<typeof fail>> => {
    const authContext = await resolveAuth(request, database)
    if (!authContext) {
        set.status = 401
        return fail('401', '未登录或登录已过期')
    }
    return authContext
}
