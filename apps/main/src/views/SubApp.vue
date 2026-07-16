<script setup lang="ts">
defineOptions({ name: 'sub-app' })

import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { bus } from 'wujie'
import { WcWujie } from 'wc-ui'

/** 须与 apps/sub-app/package.json 的 name 一致 */
const subAppName = 'sub-app'

const subAppUrl = import.meta.env.DEV
    ? '/sub-app/'
    : `/${subAppName}/`

const route = useRoute()
const subAppReady = ref(false)

const subAppPath = computed(() => {
    const match = route.params.pathMatch
    return Array.isArray(match) ? `/${match.join('/')}` : (match ? `/${match}` : '/')
})

const emitRoute = (path: string) => {
    bus.$emit(`${subAppName}-route-change`, path)
}

watch(subAppPath, (path) => {
    if (subAppReady.value) {
        emitRoute(path)
    }
})

const handleSubAppReady = () => {
    subAppReady.value = true
    emitRoute(subAppPath.value)
}
</script>

<template>
    <div class="sub-app-container">
        <WcWujie
            :name="subAppName"
            :url="subAppUrl"
            :sync="false"
            alive
            :props="{ initialPath: subAppPath }"
            @load="handleSubAppReady"
        />
    </div>
</template>

<style lang="less" scoped>
@import '@/styles/theme-vars.less';

.sub-app-container {
    background: @app-color-bg-container;
    border-radius: @app-border-radius-lg;
    box-shadow: @app-box-shadow;
    border: 1px solid @app-color-border-secondary;
    overflow: hidden;
    min-height: 500px;
}
</style>
