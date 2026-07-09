<script setup lang="ts">
import type { MenuItem } from 'wc-utils'

defineOptions({ name: 'SidebarMenu' })

defineProps<{
    items: MenuItem[]
}>()

const emit = defineEmits<{
    select: [path: string]
}>()
</script>

<template>
    <template v-for="item in items" :key="'menu-' + item.id">
        <a-sub-menu v-if="item.type === 'dir' && item.children?.length">
            <template #title>
                <span>{{ item.name }}</span>
            </template>

            <SidebarMenu :items="item.children" @select="(p) => emit('select', p as string)" />
        </a-sub-menu>

        <a-menu-item v-else-if="item.type === 'menu' && item.path" @click="emit('select', item.path)">
            {{ item.name }}
        </a-menu-item>
    </template>
</template>
