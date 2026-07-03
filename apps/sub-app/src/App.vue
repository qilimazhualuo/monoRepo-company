<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const navList = [
    { name: 'home', label: '首页' },
    { name: 'about', label: '关于' },
] as const

const isNavActive = (name: string) => route.name === name

const handleNavClick = (name: string) => {
    router.push({ name })
}
</script>

<template>
    <div class="sub-app">
        <header class="sub-app__header">
            <h2 class="sub-app__title">子应用框架</h2>
            <nav class="sub-app__nav">
                <button
                    v-for="navItem in navList"
                    :key="navItem.name"
                    class="sub-app__nav-item"
                    :class="{ 'sub-app__nav-item--active': isNavActive(navItem.name) }"
                    @click="handleNavClick(navItem.name)"
                >
                    {{ navItem.label }}
                </button>
            </nav>
        </header>
        <main class="sub-app__content">
            <router-view />
        </main>
    </div>
</template>

<style lang="less" scoped>
.sub-app {
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
            background: #e3f2fd;
            color: #1976d2;
        }
    }

    &__content {
        padding: 20px;
    }
}
</style>
