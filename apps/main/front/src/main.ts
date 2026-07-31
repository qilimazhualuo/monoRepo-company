import { patchAntdvDynamicCss } from 'wc-utils'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
    dragDirective,
    resizeHeightDirective,
    scrollDirective,
} from 'wc-ui'
import App from './App.vue'
import router from './router'
import './styles/index.less'

patchAntdvDynamicCss()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('scroll', scrollDirective)
app.directive('drag', dragDirective)
app.directive('resize-height', resizeHeightDirective)
app.mount('#app')
