<script setup lang="ts">
defineOptions({ name: 'ThemeProvider' })

import { computed } from 'vue'
import { ConfigProvider } from 'antdv-next'
import { useThemeStore } from '@/stores/theme'
import { createThemeConfigMap, resolveThemeConfig } from '@/themes/resolveTheme'
import ThemeTokenRoot from '@/components/ThemeTokenRoot.vue'

const themeStore = useThemeStore()
createThemeConfigMap()

const configProps = computed(() => {
    const baseConfig = resolveThemeConfig(themeStore.currentTheme)
    return {
        ...baseConfig,
        theme: {
            ...baseConfig.theme,
            cssVar: true,
        },
    }
})
</script>

<template>
    <ConfigProvider :key="themeStore.currentTheme" v-bind="configProps">
        <ThemeTokenRoot>
            <slot />
        </ThemeTokenRoot>
    </ConfigProvider>
</template>
