import { createApp, type App as VueApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/index.less'

let appInstance: VueApp | null = null

const mountApp = () => {
    appInstance = createApp(App)
    appInstance.use(router)
    appInstance.mount('#app')
}

const unmountApp = () => {
    appInstance?.unmount()
    appInstance = null
}

window.mount = mountApp
window.unmount = unmountApp

if (!window.__MICRO_APP_ENVIRONMENT__) {
    mountApp()
}
