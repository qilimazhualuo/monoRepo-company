import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { destroyApp } from 'wujie'
import type { MenuItem } from 'wc-utils'
import { useMenuStore } from '@/stores/menu'

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

const findMenuByPath = (items: MenuItem[], path: string): MenuItem | null => {
    for (const item of items) {
        if (item.path === path) return item
        if (item.children?.length) {
            const found = findMenuByPath(item.children, path)
            if (found) return found
        }
    }
    return null
}

/** 精确匹配优先，否则按路径前缀找最长菜单项（子应用深层路由用） */
const findMenuTitleByPath = (menuTree: MenuItem[], path: string): string | null => {
    const exact = findMenuByPath(menuTree, path)
    if (exact?.name) return exact.name

    const segments = path.split('/').filter(Boolean)
    while (segments.length > 0) {
        const candidate = `/${segments.join('/')}`
        const matched = findMenuByPath(menuTree, candidate)
        if (matched?.name) return matched.name
        segments.pop()
    }

    return null
}

const resolveTitle = (route: RouteLocationNormalizedLoaded, menuTree: MenuItem[]) => {
    if (route.path === HOME_PATH || route.name === 'home') {
        return findMenuTitleByPath(menuTree, HOME_PATH) || HOME_TITLE
    }

    const menuTitle = findMenuTitleByPath(menuTree, route.path)

    if (route.path === '/basic/dict-data') {
        const dictTypeName = String(route.query.dictTypeName || route.query.dictType || '')
        const baseTitle = menuTitle || '字典数据'
        return dictTypeName ? `${baseTitle} · ${dictTypeName}` : baseTitle
    }

    return menuTitle || '未命名'
}

const resolveRouteName = (route: RouteLocationNormalizedLoaded) => {
    if (typeof route.name === 'string' && route.name) {
        return route.name
    }
    return ''
}

/** 子应用路由首段作为 wujie name，例如 /cad2map/xxx → cad2map */
const resolveSubAppName = (path: string) => {
    const firstSegment = path.split('/').filter(Boolean)[0]
    return firstSegment || ''
}

const hasOtherSubAppTags = (views: VisitedView[], appName: string, excludePath: string) => {
    return views.some((viewItem) => {
        if (viewItem.path === excludePath) return false
        if (viewItem.name !== 'sub-app') return false
        return resolveSubAppName(viewItem.path) === appName
    })
}

export const useTagsStore = defineStore('tags', () => {
    const visitedViews = ref<VisitedView[]>([])
    const cachedViews = ref<string[]>([])
    const menuStore = useMenuStore()

    const addToCache = (routeName: string) => {
        // 微前宿主页由 wujie alive 保活，不要进 vue keep-alive，否则容易白板
        if (!routeName || routeName === 'sub-app') return

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
        const title = resolveTitle(route, menuStore.menuTree)
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

    /** 菜单异步加载后，用菜单名刷新已有页签标题 */
    const refreshTitles = () => {
        const menuTree = menuStore.menuTree
        visitedViews.value = visitedViews.value.map((viewItem) => {
            if (viewItem.path === HOME_PATH) {
                return {
                    ...viewItem,
                    title: findMenuTitleByPath(menuTree, HOME_PATH) || HOME_TITLE,
                }
            }

            if (viewItem.path === '/basic/dict-data') {
                const queryIndex = viewItem.fullPath.indexOf('?')
                const searchParams = new URLSearchParams(
                    queryIndex >= 0 ? viewItem.fullPath.slice(queryIndex) : '',
                )
                const dictTypeName = searchParams.get('dictTypeName') || searchParams.get('dictType') || ''
                const baseTitle = findMenuTitleByPath(menuTree, viewItem.path) || '字典数据'
                return {
                    ...viewItem,
                    title: dictTypeName ? `${baseTitle} · ${dictTypeName}` : baseTitle,
                }
            }

            const menuTitle = findMenuTitleByPath(menuTree, viewItem.path)
            return {
                ...viewItem,
                title: menuTitle || viewItem.title,
            }
        })
    }

    const removeVisited = (targetPath: string) => {
        const viewIndex = visitedViews.value.findIndex((viewItem) => viewItem.path === targetPath)
        if (viewIndex === -1) return null

        const [removedView] = visitedViews.value.splice(viewIndex, 1)
        if (removedView) {
            removeFromCache(removedView.name)

            // 该子应用已无页签时销毁无界实例，避免 alive 泄漏
            if (removedView.name === 'sub-app') {
                const subAppName = resolveSubAppName(removedView.path)
                if (subAppName && !hasOtherSubAppTags(visitedViews.value, subAppName, removedView.path)) {
                    destroyApp(subAppName)
                }
            }
        }

        return {
            removedView,
            viewIndex,
        }
    }

    const clearAll = () => {
        const subAppNames = new Set(
            visitedViews.value
                .filter((viewItem) => viewItem.name === 'sub-app')
                .map((viewItem) => resolveSubAppName(viewItem.path))
                .filter(Boolean),
        )
        subAppNames.forEach((appName) => destroyApp(appName))

        visitedViews.value = []
        cachedViews.value = []
    }

    return {
        visitedViews,
        cachedViews,
        addVisited,
        refreshTitles,
        removeVisited,
        clearAll,
        MAX_CACHE,
    }
})
