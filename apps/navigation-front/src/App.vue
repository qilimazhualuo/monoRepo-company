<script setup lang="ts">
import { ThemeProvider, ThemeSwitcher } from 'wc-theme'
import NavigationMap from './views/NavigationMap.vue'
</script>

<template>
    <ThemeProvider>
        <div class="nav-app">
            <header class="nav-app__header">
                <div class="nav-app__title">路网导航</div>
                <ThemeSwitcher />
            </header>
            <main class="nav-app__main">
                <NavigationMap />
            </main>
        </div>
    </ThemeProvider>
</template>

<style scoped lang="less">
.nav-app {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: var(--theme-color-bg-layout, #f5f5f5);

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 52px;
        padding: 0 16px;
        border-bottom: 1px solid var(--theme-color-border, #f0f0f0);
        background: var(--theme-color-bg-container, #fff);
    }

    &__title {
        font-size: 16px;
        font-weight: 600;
        color: var(--theme-color-text, rgba(0, 0, 0, 0.88));
    }

    &__main {
        flex: 1;
        min-height: 0;
    }
}
</style>
