import { patchAntdvDynamicCss } from 'wc-utils'
import { createApp, type App as VueApp } from 'vue'
import { createPinia } from 'pinia'
import { isThemeKey, THEME_CHANGE_EVENT, useThemeStore } from 'wc-theme'
import App from './App.vue'
import './styles/index.less'

patchAntdvDynamicCss()

const APP_NAME = 'navigation-front'

let appInstance: VueApp | null = null

const applyThemeFromHost = () => {
    const themeStore = useThemeStore()
    const initialTheme = window.$wujie?.props?.themeKey
    if (typeof initialTheme === 'string' && isThemeKey(initialTheme)) {
        themeStore.setTheme(initialTheme)
    }
}

const mountApp = () => {
    appInstance = createApp(App)
    appInstance.use(createPinia())
    appInstance.mount('#app')
    applyThemeFromHost()

    window.$wujie?.bus?.$on(THEME_CHANGE_EVENT, (themeKey: unknown) => {
        if (typeof themeKey === 'string' && isThemeKey(themeKey)) {
            useThemeStore().setTheme(themeKey)
        }
    })
}

const unmountApp = () => {
    window.$wujie?.bus?.$off(`${APP_NAME}-route-change`)
    window.$wujie?.bus?.$off(THEME_CHANGE_EVENT)
    appInstance?.unmount()
    appInstance = null
}

if (window.__POWERED_BY_WUJIE__) {
    window.__WUJIE_MOUNT = mountApp
    window.__WUJIE_UNMOUNT = unmountApp
    if (!window.__WUJIE_MOUNTED) {
        mountApp()
    }
} else {
    mountApp()
}
