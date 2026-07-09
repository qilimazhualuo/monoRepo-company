import { computed, onMounted, type ComputedRef } from 'vue'
import { useDictStore } from '../stores/dict'
import type { DictMap } from '../types/dict'

export type { DictMap, DictOption, DomainMap, DomainOption } from '../types/dict'
export { configureDict, useDictStore } from '../stores/dict'

export const useDict = (...dictTypes: string[]): ComputedRef<DictMap> => {
    const dictStore = useDictStore()

    onMounted(() => {
        dictStore.ensureDictTypes(dictTypes)
    })

    if (dictTypes.length > 0) {
        dictStore.ensureDictTypes(dictTypes)
    }

    return computed(() => {
        const result: DictMap = {}

        dictTypes.forEach((dictType) => {
            result[dictType] = dictStore.getDictOptions(dictType)
        })

        return result
    })
}
