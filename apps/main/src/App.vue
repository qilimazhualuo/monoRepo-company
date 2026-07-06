<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AppLogo } from 'wc-ui'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isLoginPage = computed(() => route.path === '/login')

const navList = [
    { path: '/', label: '首页' },
    { path: '/sub-app', label: '子应用' },
    { path: '/basic-app', label: '基础管理' },
]

const currentPath = computed(() => route.path)

const handleNavClick = (path: string) => {
    router.push(path)
}

const handleLogout = async () => {
    await userStore.logout()
    router.push('/login')
}
</script>

<template>
    <router-view v-if="isLoginPage" />

    <div v-else class="main-app">
        <header class="main-app__header">
            <AppLogo text="Micro App 主应用" />
            <div class="main-app__actions">
                <nav class="main-app__nav">
                    <button
                        v-for="navItem in navList"
                        :key="navItem.path"
                        class="main-app__nav-item"
                        :class="{ 'main-app__nav-item--active': currentPath.startsWith(navItem.path) && (navItem.path !== '/' || currentPath === '/') }"
                        @click="handleNavClick(navItem.path)"
                    >
                        {{ navItem.label }}
                    </button>
                </nav>
                <div class="main-app__user">
                    <span>{{ userStore.userInfo?.nickname || userStore.userInfo?.username }}</span>
                    <a-button size="small" @click="handleLogout">退出</a-button>
                </div>
            </div>
        </header>
        <main class="main-app__content">
            <router-view />
        </main>
    </div>
</template>

<style lang="less" scoped>
.main-app {
    min-height: 100vh;
    background: #f5f7fa;

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        height: 56px;
        background: #fff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    &__actions {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    &__nav {
        display: flex;
        gap: 8px;
    }

    &__nav-item {
        padding: 6px 16px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: #666;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
            background: #f0f2f5;
            color: #333;
        }

        &--active {
            background: #e8f0fe;
            color: #1a73e8;
            font-weight: 500;
        }
    }

    &__user {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #666;
        font-size: 14px;
    }

    &__content {
        padding: 24px;
    }
}
</style>
