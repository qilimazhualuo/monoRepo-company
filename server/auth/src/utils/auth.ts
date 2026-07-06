import type { UserRecord } from 'types'

export const toPublicUser = (user: UserRecord) => ({
    id: user.id,
    username: user.username,
    nickname: user.nickname,
})
