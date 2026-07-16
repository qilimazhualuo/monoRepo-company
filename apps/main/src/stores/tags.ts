import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

export type VisitedView = {
    path: string
    fullPath: string
    title: string
    name: string
    closable: boolean
}

const MAX_CACHE = 5
const HOME_PATH = '/'
const HOME_TITLE = '首页'

const resolveTitle = (route: RouteLocationNormalizedLoaded) => {
    if (route.path === HOME_PATH || route.name === 'home') {
        return HOME_TITLE
    }
    if (route.path === '/basic/dict-data') {
        const dictTypeName = String(route.query.dictTypeName || route.query.dictType || '')
        return dictTypeName ? `字典数据 · ${dictTypeName}` : '字典数据'
    }

    const matchedTitle = [...route.matched]
        .reverse()
        .map((record) => record.meta.title)
        .find((title) => typeof title === 'string' && title)

    return String(matchedTitle || route.meta.title || '未命名')
}

const resolveRouteName = (route: RouteLocationNormalizedLoaded) => {
    if (typeof route.name === 'string' && route.name) {
        return route.name
    }
    return ''
}

export const useTagsStore = defineStore('tags', () => {
    const visitedViews = ref<VisitedView[]>([])
    const cachedViews = ref<string[]>([])

    const addToCache = (routeName: string) => {
        if (!routeName) return

        const existIndex = cachedViews.value.indexOf(routeName)
        if (existIndex !== -1) {
            cachedViews.value.splice(existIndex, 1)
        }
        cachedViews.value.push(routeName)

        while (cachedViews.value.length > MAX_CACHE) {
            cachedViews.value.shift()
        }
    }

    const removeFromCache = (routeName: string) => {
        if (!routeName) return
        const cacheIndex = cachedViews.value.indexOf(routeName)
        if (cacheIndex !== -1) {
            cachedViews.value.splice(cacheIndex, 1)
        }
    }

    const addVisited = (route: RouteLocationNormalizedLoaded) => {
        if (route.path === '/login' || route.meta.public) return

        const routeName = resolveRouteName(route)
        const title = resolveTitle(route)
        const closable = route.path !== HOME_PATH
        const existIndex = visitedViews.value.findIndex((viewItem) => viewItem.path === route.path)

        if (existIndex !== -1) {
            visitedViews.value[existIndex] = {
                ...visitedViews.value[existIndex],
                fullPath: route.fullPath,
                title,
                name: routeName || visitedViews.value[existIndex].name,
            }
        } else {
            visitedViews.value.push({
                path: route.path,
                fullPath: route.fullPath,
                title,
                name: routeName,
                closable,
            })
        }

        addToCache(routeName)
    }

    const removeVisited = (targetPath: string) => {
        const viewIndex = visitedViews.value.findIndex((viewItem) => viewItem.path === targetPath)
        if (viewIndex === -1) return null

        const [removedView] = visitedViews.value.splice(viewIndex, 1)
        if (removedView) {
            removeFromCache(removedView.name)
        }

        return {
            removedView,
            viewIndex,
        }
    }

    const clearAll = () => {
        visitedViews.value = []
        cachedViews.value = []
    }

    return {
        visitedViews,
        cachedViews,
        addVisited,
        removeVisited,
        clearAll,
        MAX_CACHE,
    }
})
