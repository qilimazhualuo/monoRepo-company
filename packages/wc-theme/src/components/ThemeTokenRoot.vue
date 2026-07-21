<script setup lang="ts">
defineOptions({ name: 'ThemeTokenRoot' })

import { computed, type CSSProperties } from 'vue'
import { theme as antdTheme } from 'antdv-next'
import { useThemeStore } from '../stores/theme'
import { resolveThemeConfig } from '../resolveTheme'

const themeStore = useThemeStore()

/** 跟 ConfigProvider 同一份配置算 token，避免 context 不同步 */
const designToken = computed(() => {
    const themeConfig = resolveThemeConfig(themeStore.currentTheme).theme
    return antdTheme.getDesignToken(themeConfig)
})

const layoutBodyBg = computed(() => {
    const layoutToken = resolveThemeConfig(themeStore.currentTheme).theme?.components?.Layout as
        | { bodyBg?: string }
        | undefined
    return layoutToken?.bodyBg || designToken.value.colorBgLayout
})

const themeStyleVars = computed(() => {
    const token = designToken.value
    const pageBg = layoutBodyBg.value

    return {
        '--app-color-primary': token.colorPrimary,
        '--app-color-primary-hover': token.colorPrimaryHover,
        '--app-color-primary-border': token.colorPrimaryBorder,
        '--app-color-primary-bg': token.colorPrimaryBg,
        '--app-color-success': token.colorSuccess,
        '--app-color-warning': token.colorWarning,
        '--app-color-error': token.colorError,
        '--app-color-info': token.colorInfo,
        '--app-color-text': token.colorText,
        '--app-color-text-secondary': token.colorTextSecondary,
        '--app-color-text-tertiary': token.colorTextTertiary,
        '--app-color-text-quaternary': token.colorTextQuaternary,
        '--app-color-text-light': token.colorTextLightSolid,
        '--app-color-bg-base': token.colorBgBase,
        '--app-color-bg-layout': pageBg,
        '--app-color-bg-container': token.colorBgContainer,
        '--app-color-bg-elevated': token.colorBgElevated,
        '--app-color-bg-spotlight': token.colorBgSpotlight,
        '--app-color-border': token.colorBorder,
        '--app-color-border-secondary': token.colorBorderSecondary,
        '--app-color-split': token.colorSplit,
        '--app-color-fill': token.colorFill,
        '--app-color-fill-secondary': token.colorFillSecondary,
        '--app-color-fill-tertiary': token.colorFillTertiary,
        '--app-box-shadow': token.boxShadow,
        '--app-box-shadow-secondary': token.boxShadowSecondary,
        '--app-border-radius': `${token.borderRadius}px`,
        '--app-border-radius-lg': `${token.borderRadiusLG}px`,
        color: token.colorText,
        background: pageBg,
    } as CSSProperties
})
</script>

<template>
    <div class="app-theme-root" :style="themeStyleVars">
        <slot />
    </div>
</template>

<style lang="less">
.app-theme-root {
    min-height: 100vh;
}
</style>
