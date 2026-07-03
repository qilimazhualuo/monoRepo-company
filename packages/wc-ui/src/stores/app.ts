import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
    const appTitle = ref('MonoRepo 微前端')

    const setAppTitle = (title: string) => {
        appTitle.value = title
    }

    return {
        appTitle,
        setAppTitle,
    }
})
