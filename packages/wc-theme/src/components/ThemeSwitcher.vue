<script setup lang="ts">
defineOptions({ name: 'ThemeSwitcher' })

import { computed } from 'vue'
import { useThemeStore } from '../stores/theme'
import type { ThemeKey } from '../presets/themeMeta'

const themeStore = useThemeStore()

const selectedTheme = computed({
    get: () => themeStore.currentTheme,
    set: (themeKey: ThemeKey) => themeStore.setTheme(themeKey),
})

const selectOptions = themeStore.themeOptions.map((option) => ({
    value: option.key,
    label: option.label,
}))
</script>

<template>
    <a-select
        v-model:value="selectedTheme"
        class="theme-switcher"
        size="small"
        :options="selectOptions"
        :dropdown-match-select-width="false"
        placeholder="风格"
    />
</template>

<style lang="less" scoped>
.theme-switcher {
    width: 132px;
}
</style>
