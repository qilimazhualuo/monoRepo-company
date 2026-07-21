<script setup lang="ts">
defineOptions({ name: 'sub-app' })

import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { bus } from 'wujie'
import { WcWujie } from 'wc-ui'
import { useThemeStore } from 'wc-theme'

const route = useRoute()
const themeStore = useThemeStore()
const subAppReady = ref(false)
const readyAppName = ref('')

const pathSegments = computed(() => route.path.split('/').filter(Boolean))

const appName = computed(() => pathSegments.value[0] ?? '')

/** 去掉项目前缀后的子应用内部路径 */
const childPath = computed(() => {
    const restSegments = pathSegments.value.slice(1)
    return restSegments.length ? `/${restSegments.join('/')}` : '/'
})

const appUrl = computed(() => `/${appName.value}/`)

const emitRoute = (path: string) => {
    if (!appName.value) {
        return
    }
    bus.$emit(`${appName.value}-route-change`, path)
}

watch(childPath, (path) => {
    if (subAppReady.value && readyAppName.value === appName.value) {
        emitRoute(path)
    }
})

watch(appName, () => {
    subAppReady.value = false
    readyAppName.value = ''
})

const handleSubAppReady = () => {
    subAppReady.value = true
    readyAppName.value = appName.value
    emitRoute(childPath.value)
}
</script>

<template>
    <WcWujie
        v-if="appName"
        :key="appName"
        :name="appName"
        :url="appUrl"
        :sync="false"
        alive
        :props="{
            initialPath: childPath,
            themeKey: themeStore.currentTheme,
        }"
        @load="handleSubAppReady"
    />
</template>
