<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { MenuItem } from 'wc-utils'
import { AppLogo } from 'wc-ui'
import { useUserStore } from '@/stores/user'
import { useMenuStore } from '@/stores/menu'
import SidebarMenu from '@/components/SidebarMenu.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const menuStore = useMenuStore()

const isLoginPage = computed(() => route.path === '/login')

const findMenuByPath = (items: MenuItem[], targetPath: string): MenuItem | undefined => {
    for (const item of items) {
        if (item.path === targetPath) return item
        if (item.children) {
            const found = findMenuByPath(item.children, targetPath)
            if (found) return found
        }
    }
    return undefined
}

const findAncestorKeys = (items: MenuItem[], targetId: number, keys: string[] = []): string[] => {
    for (const item of items) {
        if (item.id === targetId) return keys
        if (item.children) {
            const found = findAncestorKeys(item.children, targetId, [...keys, `menu-${item.id}`])
            if (found.length) return found
        }
    }
    return []
}

const selectedMenuKey = computed(() => {
    const matched = findMenuByPath(menuStore.menuTree, route.path)
    return matched ? `menu-${matched.id}` : ''
})

const openKeys = computed(() => {
    const matched = findMenuByPath(menuStore.menuTree, route.path)
    return matched ? findAncestorKeys(menuStore.menuTree, matched.id) : []
})

const pageTitle = computed(() => String(route.meta.title || '首页'))

const handleMenuClick = (menuPath: string) => {
    router.push(menuPath)
}

const handleLogout = async () => {
    await userStore.logout()
    router.push('/login')
}
</script>

<template>
    <router-view v-if="isLoginPage" />

    <a-layout v-else class="main-app">
        <a-layout-sider class="main-app__sider" :width="220">
            <div class="main-app__logo">
                <AppLogo text="Micro App" />
            </div>

            <a-menu
                v-model:openKeys="openKeys"
                class="main-app__menu"
                mode="inline"
                :selected-keys="[selectedMenuKey]"
            >
                <SidebarMenu :items="menuStore.menuTree" @select="handleMenuClick" />
            </a-menu>
        </a-layout-sider>

        <a-layout class="main-app__layout">
            <a-layout-header class="main-app__header">
                <h2 class="main-app__title">{{ pageTitle }}</h2>

                <div class="main-app__user">
                    <span>{{ userStore.userInfo?.nickname || userStore.userInfo?.username }}</span>
                    <a-button size="small" @click="handleLogout">退出</a-button>
                </div>
            </a-layout-header>

            <a-layout-content class="main-app__content">
                <router-view />
            </a-layout-content>
        </a-layout>
    </a-layout>
</template>

<style lang="less" scoped>
.main-app {
    min-height: 100vh;
    background: #f5f7fa;

    &__sider {
        background: #fff;
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.06);
    }

    &__logo {
        display: flex;
        align-items: center;
        height: 56px;
        padding: 0 16px;
        border-bottom: 1px solid #f0f0f0;
    }

    &__menu {
        border-inline-end: none;
        padding: 8px 0;
    }

    &__layout {
        background: #f5f7fa;
    }

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 56px;
        padding: 0 24px;
        background: #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    }

    &__title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #2c3e50;
    }

    &__user {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #666;
        font-size: 14px;
    }

    &__content {
        margin: 16px;
        padding: 20px;
        min-height: calc(100vh - 88px);
        background: #fff;
        border-radius: 8px;
    }
}
</style>
