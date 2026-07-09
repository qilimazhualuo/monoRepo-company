import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PublicUser } from '@/api/auth'
import { fetchCurrentUser, logout as logoutRequest } from '@/api/auth'
import { useMenuStore } from '@/stores/menu'

export const useUserStore = defineStore('user', () => {
    const isLoggedIn = ref(false)
    const userInfo = ref<PublicUser | null>(null)

    const setUser = (user: PublicUser) => {
        isLoggedIn.value = true
        userInfo.value = user

        const menuStore = useMenuStore()
        menuStore.fetchMenus()
    }

    const clearUser = () => {
        isLoggedIn.value = false
        userInfo.value = null

        const menuStore = useMenuStore()
        menuStore.clearMenus()
    }

    const restoreSession = async () => {
        try {
            const result = await fetchCurrentUser()
            setUser(result.data)
            return true
        } catch {
            clearUser()
            return false
        }
    }

    const logout = async () => {
        try {
            await logoutRequest()
        } finally {
            clearUser()
        }
    }

    return {
        isLoggedIn,
        userInfo,
        setUser,
        clearUser,
        restoreSession,
        logout,
    }
})
