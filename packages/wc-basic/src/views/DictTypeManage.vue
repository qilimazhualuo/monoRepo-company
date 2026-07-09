<script setup lang="ts">
import { WcPage } from 'wc-page'
import { useDictStore } from 'wc-utils'
import {
    createDictType,
    deleteDictType,
    fetchDictTypes,
    updateDictType,
} from '../api/dict'
import { dictTypeFields, dictTypeSearchFields } from '../config/dictFields'

const dictStore = useDictStore()

const searchApi = async (params: Record<string, unknown>) => {
    const pageResult = await fetchDictTypes({
        page: Number(params.page) || 1,
        pageSize: Number(params.size) || 10,
        keyword: String(params.keyword || ''),
    })

    return {
        data: pageResult.list,
        total: pageResult.total,
    }
}

const addApi = async (payload: Record<string, unknown>) => {
    if (!payload.name || !payload.type) {
        throw new Error('请填写字典名称和类型')
    }

    await createDictType({
        name: String(payload.name),
        type: String(payload.type),
        status: Number(payload.status ?? 1),
        remark: payload.remark ? String(payload.remark) : null,
    })
}

const editApi = async (payload: Record<string, unknown>) => {
    await updateDictType(Number(payload.id), {
        name: String(payload.name),
        type: String(payload.type),
        status: Number(payload.status ?? 1),
        remark: payload.remark ? String(payload.remark) : null,
    })
    dictStore.clearDictCache()
}

const delsApi = async (ids: Array<string | number>) => {
    await Promise.all(ids.map((dictTypeId) => deleteDictType(Number(dictTypeId))))
    dictStore.clearDictCache()
}
</script>

<template>
    <div class="wc-basic-page">
        <WcPage
            :fields="dictTypeFields"
            :search-fields="dictTypeSearchFields"
            :search-api="searchApi"
            :add-api="addApi"
            :edit-api="editApi"
            :dels-api="delsApi"
            title="字典类型"
            :form-params="{ width: '520px' }"
        />
    </div>
</template>

<style lang="less" scoped>
.wc-basic-page {
    height: calc(100vh - 140px);
}
</style>
