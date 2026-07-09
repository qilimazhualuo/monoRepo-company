<script setup lang="ts">
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
.sub-app-container {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    min-height: 500px;
}
</style>
