import { patchAntdvDynamicCss } from 'wc-utils'
import { createApp, type App as VueApp } from 'vue'
import { createPinia } from 'pinia'
import { isThemeKey, THEME_CHANGE_EVENT, useThemeStore } from 'wc-theme'
import App from './App.vue'
import router from './router'
import './styles/index.less'

patchAntdvDynamicCss()

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
    appInstance.use(router)
    appInstance.mount('#app')

    applyThemeFromHost()

    // 挂载后导航到主应用传入的初始路由
    if (window.$wujie?.props?.initialPath) {
        router.push(window.$wujie.props.initialPath as string)
    }

    // 监听主应用后续路由切换
    window.$wujie?.bus?.$on('sub-app-route-change', (path: unknown) => {
        router.push(path as string)
    })

    // 监听主应用主题切换
    window.$wujie?.bus?.$on(THEME_CHANGE_EVENT, (themeKey: unknown) => {
        if (typeof themeKey === 'string' && isThemeKey(themeKey)) {
            useThemeStore().setTheme(themeKey)
        }
    })
}

const unmountApp = () => {
    window.$wujie?.bus?.$off('sub-app-route-change')
    window.$wujie?.bus?.$off(THEME_CHANGE_EVENT)
    appInstance?.unmount()
    appInstance = null
}

// wujie 子应用生命周期
if (window.__POWERED_BY_WUJIE__) {
    window.__WUJIE_MOUNT = mountApp
    window.__WUJIE_UNMOUNT = unmountApp
    if (!window.__WUJIE_MOUNTED) {
        mountApp()
    }
} else {
    mountApp()
}
