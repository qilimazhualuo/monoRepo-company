import { patchAntdvDynamicCss } from 'wc-utils'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/index.less'

patchAntdvDynamicCss()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
