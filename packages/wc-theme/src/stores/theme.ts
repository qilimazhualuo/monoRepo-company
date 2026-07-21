import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
    THEME_STORAGE_KEY,
    isThemeKey,
    themeOptions,
    type ThemeKey,
} from '../presets/themeMeta'

const readStoredTheme = (): ThemeKey => {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY)
            || localStorage.getItem('main-app-ui-theme')
        if (stored && isThemeKey(stored)) {
            return stored
        }
    } catch {
        // ignore
    }
    return 'default'
}

export const useThemeStore = defineStore('wc-theme', () => {
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
