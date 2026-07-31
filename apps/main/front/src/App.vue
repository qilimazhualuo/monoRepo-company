<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { bus } from 'wujie'
import type { MenuItem } from 'wc-utils'
import { AppLogo } from 'wc-ui'
import {
    ThemeProvider,
    ThemeSwitcher,
    useThemeStore,
    THEME_CHANGE_EVENT,
} from 'wc-theme'
import { useUserStore } from '@/stores/user'
import { useMenuStore } from '@/stores/menu'
import { useTagsStore } from '@/stores/tags'
import TagsView from '@/components/TagsView.vue'

type FlatMenuItem = {
    id: number
    name: string
    path: string
}

type NavGroup = {
    id: number
    name: string
    path?: string
    children: FlatMenuItem[]
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const menuStore = useMenuStore()
const tagsStore = useTagsStore()
const themeStore = useThemeStore()

const isLoginPage = computed(() => route.path === '/login')
const displayName = computed(
    () => userStore.userInfo?.nickname || userStore.userInfo?.username || '用户',
)
const tagsCount = computed(() => tagsStore.visitedViews.length)

const flattenMenus = (items: MenuItem[], result: FlatMenuItem[] = []) => {
    items.forEach((item) => {
        if (item.type === 'menu' && item.path) {
            result.push({
                id: item.id,
                name: item.name,
                path: item.path,
            })
        }
        if (item.children?.length) {
            flattenMenus(item.children, result)
        }
    })
    return result
}

const navGroups = computed<NavGroup[]>(() => {
    return menuStore.menuTree.map((item) => {
        if (item.type === 'dir') {
            return {
                id: item.id,
                name: item.name,
                children: flattenMenus(item.children || []),
            }
        }
        if (item.type === 'menu' && item.path) {
            return {
                id: item.id,
                name: item.name,
                path: item.path,
                children: [],
            }
        }
        return {
            id: item.id,
            name: item.name,
            children: flattenMenus(item.children || []),
        }
    }).filter((group) => group.path || group.children.length)
})

const isGroupActive = (group: NavGroup) => {
    if (group.path && route.path === group.path) {
        return true
    }
    return group.children.some((child) => child.path === route.path)
}

watch(
    () => themeStore.currentTheme,
    (themeKey) => {
        bus.$emit(THEME_CHANGE_EVENT, themeKey)
    },
)

const handleNavigate = (targetPath?: string) => {
    if (!targetPath) {
        return
    }
    router.push(targetPath)
}

const getTagsPopupContainer = (triggerNode: HTMLElement) => {
    return triggerNode.parentElement || document.body
}

const handleLogout = async () => {
    await userStore.logout()
    router.push('/login')
}
</script>

<template>
    <ThemeProvider>
        <router-view v-if="isLoginPage" />

        <div v-else class="main-app">
            <header class="main-app__header">
                <div class="main-app__header-left">
                    <div class="main-app__logo">
                        <AppLogo text="Micro App" />
                    </div>

                    <nav class="main-app__nav">
                        <div
                            v-for="group in navGroups"
                            :key="group.id"
                            class="main-app__nav-item"
                        >
                            <button
                                v-if="group.children.length"
                                type="button"
                                class="main-app__nav-link"
                                :class="{ 'is-active': isGroupActive(group) }"
                            >
                                {{ group.name }}
                                <span class="main-app__caret" />
                            </button>
                            <button
                                v-else
                                type="button"
                                class="main-app__nav-link"
                                :class="{ 'is-active': isGroupActive(group) }"
                                @click="handleNavigate(group.path)"
                            >
                                {{ group.name }}
                            </button>

                            <div
                                v-if="group.children.length"
                                class="main-app__dropdown"
                            >
                                <button
                                    v-for="child in group.children"
                                    :key="child.id"
                                    type="button"
                                    class="main-app__dropdown-item"
                                    :class="{ 'is-active': route.path === child.path }"
                                    @click="handleNavigate(child.path)"
                                >
                                    {{ child.name }}
                                </button>
                            </div>
                        </div>
                    </nav>
                </div>

                <div class="main-app__header-right">
                    <ThemeSwitcher />
                    <span class="main-app__username">{{ displayName }}</span>
                    <a-button size="small" @click="handleLogout">退出</a-button>
                </div>
            </header>

            <div
                v-drag
                class="main-app__tags-float"
            >
                <a-dropdown
                    :trigger="['click']"
                    placement="topLeft"
                    :force-render="true"
                    :destroy-on-hidden="false"
                    :get-popup-container="getTagsPopupContainer"
                >
                    <a-button
                        type="primary"
                        shape="circle"
                        class="main-app__tags-trigger"
                    >
                        {{ tagsCount }}
                    </a-button>
                    <template #popupRender>
                        <div class="main-app__tags-panel">
                            <TagsView direction="vertical" />
                        </div>
                    </template>
                </a-dropdown>
            </div>

            <main class="main-app__content">
                <router-view v-slot="{ Component }">
                    <keep-alive
                        :max="tagsStore.MAX_CACHE"
                        :include="tagsStore.cachedViews"
                        :exclude="['sub-app']"
                    >
                        <component
                            :is="Component"
                            :key="String(route.name || route.path)"
                        />
                    </keep-alive>
                </router-view>
            </main>
        </div>
    </ThemeProvider>
</template>

<style lang="less" scoped>
.main-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-height: 100vh;
    background: @app-color-bg-layout;

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        height: 56px;
        padding: 0 20px;
        background: @app-color-bg-container;
        border-bottom: 1px solid @app-color-split;
        box-shadow: @app-box-shadow;
    }

    &__header-left {
        display: flex;
        align-items: center;
        gap: 20px;
        flex: 1;
    }

    &__logo {
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }

    &__nav {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    &__nav-item {
        position: relative;

        &:hover {
            .main-app__dropdown {
                display: grid;
            }

            .main-app__nav-link {
                color: @app-color-primary;
                background: @app-color-primary-bg;
            }
        }
    }

    &__nav-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 36px;
        padding: 0 12px;
        border: 0;
        border-radius: @app-border-radius;
        background: transparent;
        color: @app-color-text-secondary;
        font-size: 14px;
        cursor: pointer;
        transition: color 0.15s, background 0.15s;

        &:hover,
        &.is-active {
            color: @app-color-primary;
            background: @app-color-primary-bg;
        }
    }

    &__caret {
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 5px solid currentColor;
        opacity: 0.7;
    }

    &__dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 100;
        display: none;
        gap: 2px;
        min-width: 180px;
        padding: 8px;
        margin-top: 8px;
        border: 1px solid @app-color-border-secondary;
        border-radius: @app-border-radius-lg;
        background: @app-color-bg-container;
        box-shadow: @app-box-shadow;

        &::before {
            content: '';
            position: absolute;
            top: -8px;
            right: 0;
            left: 0;
            height: 8px;
        }
    }

    &__dropdown-item {
        width: 100%;
        padding: 8px 12px;
        border: 0;
        border-radius: @app-border-radius;
        background: transparent;
        color: @app-color-text;
        font-size: 13px;
        text-align: left;
        cursor: pointer;

        &:hover,
        &.is-active {
            color: @app-color-primary;
            background: @app-color-primary-bg;
        }
    }

    &__header-right {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        gap: 12px;
    }

    &__username {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 14px;
        color: @app-color-text-secondary;
    }

    &__tags-float {
        position: fixed;
        left: 24px;
        bottom: 24px;
        z-index: 1000;
    }

    &__tags-trigger {
        width: 48px;
        height: 48px;
        box-shadow: @app-box-shadow;
        cursor: move;
        font-size: 16px;
        font-weight: 600;
    }

    &__tags-panel {
        min-width: 220px;
        max-width: 320px;
        max-height: 360px;
        padding: 8px;
        overflow: auto;
        border: 1px solid @app-color-border-secondary;
        border-radius: @app-border-radius-lg;
        background: @app-color-bg-container;
        box-shadow: @app-box-shadow;
    }

    &__content {
        flex: 1;
        min-height: 0;
        margin: 16px;
        padding: 8px;
        overflow: hidden;
        border-radius: @app-border-radius-lg;
        background: @app-color-bg-container;
        box-shadow: @app-box-shadow;
        color: @app-color-text;

        :deep(> *) {
            height: 100%;
        }
    }
}

@media (max-width: 900px) {
    .main-app {
        &__header {
            height: auto;
            min-height: 56px;
            padding: 10px 12px;
            flex-wrap: wrap;
        }

        &__header-left {
            width: 100%;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
        }

        &__nav {
            width: 100%;
        }
    }
}
</style>
