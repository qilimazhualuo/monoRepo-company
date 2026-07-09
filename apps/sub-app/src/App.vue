<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { basicNavList } from 'wc-basic'

const route = useRoute()
const router = useRouter()

const menuList = [
    { name: 'home', label: '首页' },
    ...basicNavList.map((navItem) => ({
        name: navItem.name,
        label: navItem.label,
    })),
    { name: 'about', label: '关于' },
]

const selectedMenuKey = computed(() => String(route.name || 'home'))
const pageTitle = computed(() => String(route.meta.title || '子应用'))

const handleMenuClick = (menuName: string) => {
    router.push({ name: menuName })
}
</script>

<template>
    <a-layout class="sub-app">
        <a-layout-sider class="sub-app__sider" :width="200">
            <div class="sub-app__brand">子应用</div>

            <a-menu
                class="sub-app__menu"
                mode="inline"
                :selected-keys="[selectedMenuKey]"
                @click="({ key }) => handleMenuClick(String(key))"
            >
                <a-menu-item v-for="menuItem in menuList" :key="menuItem.name">
                    {{ menuItem.label }}
                </a-menu-item>
            </a-menu>
        </a-layout-sider>

        <a-layout class="sub-app__layout">
            <a-layout-header class="sub-app__header">
                <h2 class="sub-app__title">{{ pageTitle }}</h2>
            </a-layout-header>

            <a-layout-content class="sub-app__content">
                <router-view />
            </a-layout-content>
        </a-layout>
    </a-layout>
</template>

<style lang="less" scoped>
.sub-app {
    min-height: 100%;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;

    &__sider {
        background: #fafafa;
        border-right: 1px solid #eee;
    }

    &__brand {
        display: flex;
        align-items: center;
        height: 48px;
        padding: 0 16px;
        font-size: 14px;
        font-weight: 600;
        color: #2c3e50;
        border-bottom: 1px solid #eee;
    }

    &__menu {
        border-inline-end: none;
        background: transparent;
    }

    &__layout {
        background: #fff;
    }

    &__header {
        display: flex;
        align-items: center;
        height: 48px;
        padding: 0 20px;
        background: #fff;
        border-bottom: 1px solid #eee;
    }

    &__title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #2c3e50;
    }

    &__content {
        padding: 20px;
        min-height: calc(100% - 48px);
    }
}
</style>
