import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MenuItem } from 'wc-utils'
import { fetchUserMenus } from '@/api/menu'

export const useMenuStore = defineStore('menu', () => {
    const menuTree = ref<MenuItem[]>([])

    const fetchMenus = async () => {
        try {
            const result = await fetchUserMenus()
            menuTree.value = result
        } catch {
            menuTree.value = []
        }
    }

    const clearMenus = () => {
        menuTree.value = []
    }

    return {
        menuTree,
        fetchMenus,
        clearMenus,
    }
})
