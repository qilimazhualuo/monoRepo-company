export type { ThemeKey, ThemeOption } from './presets/themeMeta'
export {
    themeOptions,
    THEME_STORAGE_KEY,
    THEME_CHANGE_EVENT,
    DARK_THEME_KEYS,
    isThemeKey,
    isDarkThemeKey,
} from './presets/themeMeta'

export { createThemeConfigMap, resolveThemeConfig } from './resolveTheme'
export { useThemeStore } from './stores/theme'

export { default as ThemeProvider } from './components/ThemeProvider.vue'
export { default as ThemeTokenRoot } from './components/ThemeTokenRoot.vue'
export { default as ThemeSwitcher } from './components/ThemeSwitcher.vue'

/**
 * Less 变量（@app-color-*）不能靠 JS import 注入到各组件 style。
 * 应用 vite 配置请加：
 * css.preprocessorOptions.less.additionalData = THEME_LESS_ADDITIONAL_DATA
 */
export const THEME_LESS_ADDITIONAL_DATA = '@import "wc-theme/theme-vars.less";\n'
