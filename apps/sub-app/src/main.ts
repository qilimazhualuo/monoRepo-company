import { patchAntdvDynamicCss } from 'wc-utils'
import { createApp, type App as VueApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/index.less'

patchAntdvDynamicCss()

let appInstance: VueApp | null = null

const mountApp = () => {
    appInstance = createApp(App)
    appInstance.use(createPinia())
    appInstance.use(router)
    appInstance.mount('#app')
}

const unmountApp = () => {
    appInstance?.unmount()
    appInstance = null
}

// wujie 子应用生命周期
if (window.__POWERED_BY_WUJIE__) {
    window.__WUJIE_MOUNT = mountApp
    window.__WUJIE_UNMOUNT = unmountApp
    // wujie 会在合适的时机主动调用 mount
    // 如果此时 wujie 还未触发 mount，也要主动挂载一次
    if (!window.__WUJIE_MOUNTED) {
        mountApp()
    }
} else {
    // 独立运行时直接挂载
    mountApp()
}
