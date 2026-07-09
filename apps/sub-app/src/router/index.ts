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

        path: 'about',

        name: 'about',

        component: () => import('@/views/About.vue'),

        meta: { title: '关于' },

    },

]



const router = createRouter({

    history: createWebHashHistory(),

    routes: [

        {

            path: '/',

            component: RootApp,

            children: childRoutes,

        },

    ],

})



export default router

