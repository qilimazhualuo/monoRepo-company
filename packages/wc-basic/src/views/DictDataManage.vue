<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { WcPage } from 'wc-page'
import type { PageField } from 'wc-page'
import type { DictTypeItem } from 'wc-utils'
import { useDictStore } from 'wc-utils'
import {
    createDictData,
    deleteDictData,
    fetchAllDictTypes,
    fetchDictDataList,
    updateDictData,
} from '../api/dict'
import { dictDataFields, dictDataSearchFields } from '../config/dictFields'

const route = useRoute()
const dictStore = useDictStore()
const dictTypeList = ref<DictTypeItem[]>([])

const fields = computed<PageField[]>(() => {
    const nextFields = JSON.parse(JSON.stringify(dictDataFields)) as PageField[]
    const dictTypeField = nextFields.find((fieldItem) => fieldItem.field === 'dictType')

    if (dictTypeField?.dataType) {
        dictTypeField.dataType.options = dictTypeList.value as unknown as Array<Record<string, unknown>>
    }

    return nextFields
})

const searchFields = computed(() => {
    const nextSearchFields = JSON.parse(JSON.stringify(dictDataSearchFields))
    const dictTypeSearchField = nextSearchFields.find((fieldItem: { searchField: string }) => (
        fieldItem.searchField === 'dictType'
    ))

    if (dictTypeSearchField) {
        dictTypeSearchField.options = dictTypeList.value as unknown as Array<Record<string, unknown>>
        dictTypeSearchField.fieldNames = { label: 'name', value: 'type' }
    }

    return nextSearchFields
})

const searchApi = async (params: Record<string, unknown>) => {
    const pageResult = await fetchDictDataList({
        page: Number(params.page) || 1,
        pageSize: Number(params.size) || 10,
        keyword: String(params.keyword || ''),
        dictType: String(params.dictType || route.query.dictType || ''),
    })

    return {
        data: pageResult.list,
        total: pageResult.total,
    }
}

const refreshDictCache = async (dictType?: unknown) => {
    const dictTypeKey = String(dictType || route.query.dictType || '')
    if (dictTypeKey) {
        await dictStore.refreshDictTypes(dictTypeKey)
    }
}

const addApi = async (payload: Record<string, unknown>) => {
    if (!payload.dictType || !payload.label || !payload.value) {
        throw new Error('请填写字典类型、标签和键值')
    }

    await createDictData({
        dictType: String(payload.dictType),
        label: String(payload.label),
        value: String(payload.value),
        sort: Number(payload.sort ?? 0),
        status: Number(payload.status ?? 1),
        remark: payload.remark ? String(payload.remark) : null,
    })
    await refreshDictCache(payload.dictType)
}

const editApi = async (payload: Record<string, unknown>) => {
    await updateDictData(Number(payload.id), {
        dictType: String(payload.dictType),
        label: String(payload.label),
        value: String(payload.value),
        sort: Number(payload.sort ?? 0),
        status: Number(payload.status ?? 1),
        remark: payload.remark ? String(payload.remark) : null,
    })
    await refreshDictCache(payload.dictType)
}

const delsApi = async (ids: Array<string | number>) => {
    await Promise.all(ids.map((dictDataId) => deleteDictData(Number(dictDataId))))
    await refreshDictCache()
}

onMounted(async () => {
    dictTypeList.value = await fetchAllDictTypes()
})
</script>

<template>
    <div class="wc-basic-page">
        <WcPage
            :fields="fields"
            :search-fields="searchFields"
            :search-api="searchApi"
            :add-api="addApi"
            :edit-api="editApi"
            :dels-api="delsApi"
            title="字典数据"
            :form-params="{ width: '520px' }"
        />
    </div>
</template>

<style lang="less" scoped>
.wc-basic-page {
    height: calc(100vh - 140px);
}
</style>
