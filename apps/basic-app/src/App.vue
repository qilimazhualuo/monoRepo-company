<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const navList = [
    { name: 'home', label: '首页' },
    { name: 'datasource', label: '数据源配置' },
] as const

const isNavActive = (name: string) => route.name === name

const handleNavClick = (name: string) => {
    router.push({ name })
}
</script>

<template>
    <div class="basic-app">
        <header class="basic-app__header">
            <h2 class="basic-app__title">基础管理</h2>
            <nav class="basic-app__nav">
                <button
                    v-for="navItem in navList"
                    :key="navItem.name"
                    class="basic-app__nav-item"
                    :class="{ 'basic-app__nav-item--active': isNavActive(navItem.name) }"
                    @click="handleNavClick(navItem.name)"
                >
                    {{ navItem.label }}
                </button>
            </nav>
        </header>
        <main class="basic-app__content">
            <router-view />
        </main>
    </div>
</template>

<style lang="less" scoped>
.basic-app {
    min-height: 100%;
    background: #fff;
    border-radius: 8px;

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #eee;
    }

    &__title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #2c3e50;
    }

    &__nav {
        display: flex;
        gap: 8px;
    }

    &__nav-item {
        padding: 4px 12px;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: #666;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
            background: #f5f5f5;
        }

        &--active {
            background: #e8f5e9;
            color: #2e7d32;
        }
    }

    &__content {
        padding: 20px;
    }
}
</style>
