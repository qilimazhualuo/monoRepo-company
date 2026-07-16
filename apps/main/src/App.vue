<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { MenuItem } from 'wc-utils'
import { AppLogo } from 'wc-ui'
import { useUserStore } from '@/stores/user'
import { useMenuStore } from '@/stores/menu'
import { useTagsStore } from '@/stores/tags'
import TagsView from '@/components/TagsView.vue'
import ThemeProvider from '@/components/ThemeProvider.vue'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import { useThemeStore } from '@/stores/theme'

type AntdMenuItem = {
    key: string
    label: string
    children?: AntdMenuItem[]
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const menuStore = useMenuStore()
const tagsStore = useTagsStore()
const themeStore = useThemeStore()

const openKeys = ref<string[]>([])

const isLoginPage = computed(() => route.path === '/login')
const isDarkTheme = computed(() => (
    themeStore.currentTheme === 'dark' || themeStore.currentTheme === 'geek'
))

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

const findMenuById = (items: MenuItem[], targetId: number): MenuItem | undefined => {
    for (const item of items) {
        if (item.id === targetId) return item
        if (item.children) {
            const found = findMenuById(item.children, targetId)
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

const toAntdMenuItems = (items: MenuItem[]): AntdMenuItem[] => {
    return items.flatMap((item) => {
        if (item.type === 'dir' && item.children?.length) {
            return [{
                key: `menu-${item.id}`,
                label: item.name,
                children: toAntdMenuItems(item.children),
            }]
        }

        if (item.type === 'menu' && item.path) {
            return [{
                key: `menu-${item.id}`,
                label: item.name,
            }]
        }

        return []
    })
}

const antdMenuItems = computed(() => toAntdMenuItems(menuStore.menuTree))

const resolveActiveMenu = () => {
    if (route.path === '/basic/dict-data') {
        return findMenuByPath(menuStore.menuTree, '/basic/dict-type')
    }
    return findMenuByPath(menuStore.menuTree, route.path)
}

const selectedMenuKey = computed(() => {
    const matched = resolveActiveMenu()
    return matched ? `menu-${matched.id}` : ''
})

const syncOpenKeys = () => {
    const matched = resolveActiveMenu()
    openKeys.value = matched ? findAncestorKeys(menuStore.menuTree, matched.id) : []
}

watch(
    () => [route.path, menuStore.menuTree] as const,
    () => syncOpenKeys(),
    { immediate: true, deep: true },
)

const handleMenuClick = (info: { key: string | number }) => {
    const menuId = Number(String(info.key).replace('menu-', ''))
    if (Number.isNaN(menuId)) return

    const matched = findMenuById(menuStore.menuTree, menuId)
    if (matched?.path) {
        router.push(matched.path)
    }
}

const handleLogout = async () => {
    await userStore.logout()
    router.push('/login')
}
</script>

<template>
    <ThemeProvider>
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
                    :theme="isDarkTheme ? 'dark' : 'light'"
                    :selected-keys="[selectedMenuKey]"
                    :items="antdMenuItems"
                    @click="handleMenuClick"
                />
            </a-layout-sider>

            <a-layout class="main-app__layout">
                <a-layout-header class="main-app__header">
                    <TagsView />

                    <div class="main-app__user">
                        <ThemeSwitcher />
                        <span>{{ userStore.userInfo?.nickname || userStore.userInfo?.username }}</span>
                        <a-button size="small" @click="handleLogout">退出</a-button>
                    </div>
                </a-layout-header>

                <a-layout-content class="main-app__content">
                    <router-view v-slot="{ Component }">
                        <keep-alive :max="tagsStore.MAX_CACHE" :include="tagsStore.cachedViews">
                            <component :is="Component" :key="route.path" />
                        </keep-alive>
                    </router-view>
                </a-layout-content>
            </a-layout>
        </a-layout>
    </ThemeProvider>
</template>

<style lang="less" scoped>
@import '@/styles/theme-vars.less';

.main-app {
    min-height: 100vh;
    background: @app-color-bg-layout;

    &__sider {
        box-shadow: @app-box-shadow;
    }

    &__logo {
        display: flex;
        align-items: center;
        height: 56px;
        padding: 0 16px;
        border-bottom: 1px solid @app-color-split;
    }

    &__menu {
        border-inline-end: none;
        padding: 8px 0;
    }

    &__header {
        display: flex;
        align-items: center;
        gap: 16px;
        height: 56px;
        padding: 0 24px;
        box-shadow: @app-box-shadow;
        color: @app-color-text;
    }

    &__user {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        gap: 12px;
        font-size: 14px;
        color: @app-color-text-secondary;
    }

    &__content {
        margin: 16px;
        padding: 20px;
        min-height: calc(100vh - 88px);
        border-radius: @app-border-radius-lg;
        background: @app-color-bg-container !important;
        box-shadow: @app-box-shadow;
        color: @app-color-text;
    }

    :deep(.ant-layout),
    :deep(.ant-layout-content) {
        background: transparent;
    }
}
</style>
