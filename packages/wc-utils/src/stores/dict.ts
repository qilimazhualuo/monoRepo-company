import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createHttpClient } from '../http/client'
import type { DictCachePayload, DictMap, DictOption } from '../types/dict'

const DICT_STORAGE_KEY = 'wc_dict_cache'

let dictBaseUrl = '/api'

const loadDictCache = (): DictCachePayload => {
    if (typeof localStorage === 'undefined') {
        return { updatedAt: 0, data: {} }
    }

    try {
        const raw = localStorage.getItem(DICT_STORAGE_KEY)
        if (!raw) {
            return { updatedAt: 0, data: {} }
        }

        return JSON.parse(raw) as DictCachePayload
    } catch {
        return { updatedAt: 0, data: {} }
    }
}

const saveDictCache = (payload: DictCachePayload) => {
    if (typeof localStorage === 'undefined') {
        return
    }

    localStorage.setItem(DICT_STORAGE_KEY, JSON.stringify(payload))
}

export const configureDict = (options: { baseUrl?: string } = {}) => {
    dictBaseUrl = options.baseUrl ?? '/api'
}

export const useDictStore = defineStore('wc-dict', () => {
    const cachePayload = loadDictCache()
    const dictMap = ref<DictMap>(cachePayload.data)
    const loadedTypes = ref<Set<string>>(new Set(Object.keys(cachePayload.data)))
    const inflightTypes = new Set<string>()
    let batchPromise: Promise<void> | null = null
    let pendingTypes: string[] = []

    const persistCache = () => {
        saveDictCache({
            updatedAt: Date.now(),
            data: dictMap.value,
        })
    }

    const getDictOptions = (dictType: string): DictOption[] => dictMap.value[dictType] ?? []

    const markLoaded = (dictType: string, options: DictOption[]) => {
        dictMap.value = {
            ...dictMap.value,
            [dictType]: options,
        }
        loadedTypes.value = new Set([...loadedTypes.value, dictType])
        persistCache()
    }

    const fetchDictTypes = async (dictTypes: string[]) => {
        if (dictTypes.length === 0) {
            return
        }

        const httpClient = createHttpClient({ baseUrl: dictBaseUrl })
        const query = encodeURIComponent(dictTypes.join(','))
        const result = await httpClient.get<DictMap>(`/system/dict/data/batch?types=${query}`)

        dictTypes.forEach((dictType) => {
            markLoaded(dictType, result.data[dictType] ?? [])
        })
    }

    const flushBatch = async () => {
        const requestTypes = [...new Set(pendingTypes)]
        pendingTypes = []
        batchPromise = null

        requestTypes.forEach((dictType) => inflightTypes.add(dictType))

        try {
            await fetchDictTypes(requestTypes)
        } finally {
            requestTypes.forEach((dictType) => inflightTypes.delete(dictType))
        }
    }

    const ensureDictTypes = async (dictTypes: string[]) => {
        const missingTypes = dictTypes.filter((dictType) => (
            !loadedTypes.value.has(dictType) && !inflightTypes.has(dictType)
        ))

        if (missingTypes.length === 0) {
            return
        }

        pendingTypes.push(...missingTypes)

        if (!batchPromise) {
            batchPromise = flushBatch()
        }

        await batchPromise
    }

    const invalidateDictTypes = (...dictTypes: string[]) => {
        const nextLoadedTypes = new Set(loadedTypes.value)
        const nextDictMap = { ...dictMap.value }

        dictTypes.forEach((dictType) => {
            nextLoadedTypes.delete(dictType)
            delete nextDictMap[dictType]
        })

        loadedTypes.value = nextLoadedTypes
        dictMap.value = nextDictMap
        persistCache()
    }

    const refreshDictTypes = async (...dictTypes: string[]) => {
        invalidateDictTypes(...dictTypes)
        await ensureDictTypes(dictTypes)
    }

    const clearDictCache = () => {
        loadedTypes.value = new Set()
        dictMap.value = {}
        persistCache()
    }

    return {
        dictMap,
        getDictOptions,
        ensureDictTypes,
        invalidateDictTypes,
        refreshDictTypes,
        clearDictCache,
    }
})
