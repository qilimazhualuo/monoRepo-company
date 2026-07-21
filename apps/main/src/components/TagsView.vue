<script setup lang="ts">
defineOptions({ name: 'TagsView' })

import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTagsStore } from '@/stores/tags'
import { useMenuStore } from '@/stores/menu'

const route = useRoute()
const router = useRouter()
const tagsStore = useTagsStore()
const menuStore = useMenuStore()
const routerReady = ref(false)

const syncVisited = () => {
    if (!routerReady.value) return
    if (route.path === '/login' || route.meta.public) return
    tagsStore.addVisited(route)
}

router.isReady().then(() => {
    routerReady.value = true
    syncVisited()
})

watch(
    () => route.fullPath,
    () => syncVisited(),
)

watch(
    () => menuStore.menuTree,
    () => {
        tagsStore.refreshTitles()
        syncVisited()
    },
    { deep: true },
)

const handleTagClick = (targetPath: string, targetFullPath: string) => {
    if (targetPath === route.path) return
    router.push(targetFullPath)
}

const handleTagClose = (event: Event, targetPath: string) => {
    event.stopPropagation()

    const result = tagsStore.removeVisited(targetPath)
    if (!result) return

    if (targetPath !== route.path) return

    const nextView = tagsStore.visitedViews[result.viewIndex]
        || tagsStore.visitedViews[result.viewIndex - 1]

    router.push(nextView?.fullPath || '/')
}
</script>

<template>
    <div class="tags-view">
        <button
            v-for="viewItem in tagsStore.visitedViews"
            :key="viewItem.path"
            type="button"
            class="tags-view__tag"
            :class="{ 'tags-view__tag--active': viewItem.path === route.path }"
            @click="handleTagClick(viewItem.path, viewItem.fullPath)"
        >
            <span class="tags-view__text">{{ viewItem.title }}</span>
            <span
                v-if="viewItem.closable"
                class="tags-view__close"
                @click="handleTagClose($event, viewItem.path)"
            >×</span>
        </button>
    </div>
</template>

<style lang="less" scoped>
.tags-view {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow-x: auto;
    padding: 4px 0;

    &::-webkit-scrollbar {
        height: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: @app-color-fill-secondary;
        border-radius: 2px;
    }

    &__tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        height: 28px;
        padding: 0 10px;
        border: 1px solid @app-color-border;
        border-radius: @app-border-radius @app-border-radius 0 0;
        background: @app-color-fill-secondary;
        color: @app-color-text-secondary;
        font-size: 13px;
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s, background 0.15s;

        &:hover {
            color: @app-color-primary;
            border-color: @app-color-primary-border;
        }

        &--active {
            color: @app-color-primary;
            background: @app-color-bg-container;
            border-color: @app-color-primary;
            border-bottom-color: @app-color-bg-container;
            box-shadow: inset 0 -2px 0 @app-color-primary;
        }
    }

    &__text {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        font-size: 14px;
        line-height: 1;
        color: @app-color-text-tertiary;

        &:hover {
            color: @app-color-text-light;
            background: @app-color-primary;
        }
    }
}
</style>
