<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { startApp, destroyApp, bus } from 'wujie'

export interface WcWujieProps {
    name: string
    url: string
    sync?: boolean
    alive?: boolean
    /** wujie 子应用 props，传递给子应用的初始数据 */
    props?: Record<string, unknown>
    /** 子应用加载前触发 */
    beforeLoad?: () => void
    /** 子应用加载后触发 */
    afterLoad?: () => void
}

const props = withDefaults(defineProps<WcWujieProps>(), {
    sync: true,
    alive: true,
})

const emit = defineEmits<{
    (e: 'load', appName: string): void
    (e: 'mount', appName: string): void
    (e: 'unmount', appName: string): void
}>()

const containerRef = ref<HTMLDivElement>()

const start = async () => {
    if (!containerRef.value) return

    props.beforeLoad?.()

    const result = await startApp({
        name: props.name,
        url: props.url,
        el: containerRef.value,
        sync: props.sync,
        alive: props.alive,
        props: props.props,
    })

    props.afterLoad?.()
    return result
}

const busEventHandlers: Array<{ event: string; handler: (...args: unknown[]) => void }> = []

onMounted(async () => {
    await start()

    busEventHandlers.push({
        event: `${props.name}-mounted`,
        handler: () => emit('mount', props.name),
    })
    busEventHandlers.push({
        event: `${props.name}-unmounted`,
        handler: () => emit('unmount', props.name),
    })

    busEventHandlers.forEach(({ event, handler }) => {
        bus.$on(event, handler as Function)
    })

    emit('load', props.name)
})

onUnmounted(() => {
    busEventHandlers.forEach(({ event, handler }) => {
        bus.$off(event, handler as Function)
    })
    destroyApp(props.name)
})

// URL 变化时重新启动
watch(() => props.url, async () => {
    destroyApp(props.name)
    await start()
})
</script>

<template>
    <div ref="containerRef" class="wc-wujie" />
</template>

<style lang="less" scoped>
.wc-wujie {
    width: 100%;
    min-height: 500px;
}
</style>
