import { defineStore } from 'pinia'
import { ref } from 'vue'
import { THEME_STORAGE_KEY, themeOptions, type ThemeKey } from '@/themes/themeMeta'

const isThemeKey = (value: string): value is ThemeKey => (
    themeOptions.some((option) => option.key === value)
)

const readStoredTheme = (): ThemeKey => {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY)
        if (stored && isThemeKey(stored)) {
            return stored
        }
    } catch {
        // ignore
    }
    return 'default'
}

export const useThemeStore = defineStore('theme', () => {
    const currentTheme = ref<ThemeKey>(readStoredTheme())

    const setTheme = (themeKey: ThemeKey) => {
        currentTheme.value = themeKey
        try {
            localStorage.setItem(THEME_STORAGE_KEY, themeKey)
        } catch {
            // ignore
        }
    }

    return {
        currentTheme,
        setTheme,
        themeOptions,
    }
})
