import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import RootApp from '@/RootApp.vue'

const childRoutes: RouteRecordRaw[] = [
    {
        path: '',
        name: 'home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页' },
    },
    {
        path: 'datasource',
        name: 'datasource',
        component: () => import('@/views/DataSource.vue'),
        meta: { title: '数据源配置' },
    },
]

const baseRoute = window.__MICRO_APP_BASE_ROUTE__ || '/'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: baseRoute,
            component: RootApp,
            children: childRoutes,
        },
    ],
})

export default router
