import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('@/views/Login.vue'),
            meta: { title: '登录', public: true },
        },
        {
            path: '/',
            name: 'home',
            component: () => import('@/views/Home.vue'),
            meta: { title: '首页', requiresAuth: true },
        },
        {
            path: '/sub-app/:pathMatch(.*)*',
            name: 'sub-app',
            component: () => import('@/views/SubApp.vue'),
            meta: { title: '子应用', requiresAuth: true },
        },
    ],
})

router.beforeEach(async (to) => {
    const userStore = useUserStore()

    if (!userStore.isLoggedIn && !to.meta.public) {
        const restored = await userStore.restoreSession()
        if (!restored && to.meta.requiresAuth) {
            return '/login'
        }
    }

    if (to.path === '/login' && userStore.isLoggedIn) {
        return '/'
    }

    return true
})

export default router
