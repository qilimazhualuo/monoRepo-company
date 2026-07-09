<script setup lang="ts">
import { ref } from 'vue'
import { WcPage } from 'wc-page'
import type { OrgItem } from 'wc-utils'
import { createOrg, deleteOrg, fetchOrgTree, updateOrg } from '../api/system'
import { orgFields } from '../config/orgFields'

const pageRef = ref<InstanceType<typeof WcPage> | null>(null)
const createParentId = ref<number | null>(null)

const searchApi = async () => {
    const orgTree = await fetchOrgTree()
    return { data: orgTree }
}

const addApi = async (payload: Record<string, unknown>) => {
    if (!payload.name || !payload.code) {
        throw new Error('请填写单位名称和编码')
    }
    await createOrg({
        parentId: payload.parentId ? Number(payload.parentId) : null,
        name: String(payload.name),
        code: String(payload.code),
        sort: Number(payload.sort ?? 0),
        status: Number(payload.status ?? 1),
    })
}

const editApi = async (payload: Record<string, unknown>) => {
    await updateOrg(Number(payload.id), {
        parentId: payload.parentId ? Number(payload.parentId) : null,
        name: String(payload.name),
        code: String(payload.code),
        sort: Number(payload.sort ?? 0),
        status: Number(payload.status ?? 1),
    })
}

const delsApi = async (ids: Array<string | number>) => {
    await Promise.all(ids.map((orgId) => deleteOrg(Number(orgId))))
}

const customAdd = async () => {
    const parentId = createParentId.value
    createParentId.value = null
    return {
        parentId,
        name: '',
        code: '',
        sort: 0,
        status: 1,
    }
}

const openCreateChild = (orgItem: OrgItem) => {
    createParentId.value = orgItem.id
    pageRef.value?.openForm()
}
</script>

<template>
    <div class="wc-basic-page">
        <WcPage
            ref="pageRef"
            :fields="orgFields"
            :search-api="searchApi"
            :add-api="addApi"
            :edit-api="editApi"
            :dels-api="delsApi"
            :custom-add="customAdd"
            title="单位"
            :table-params="{
                pagination: false,
                defaultBtn: ['edit', 'del'],
            }"
            :form-params="{ width: '480px' }"
            :btn-group="{ add: true, del: false }"
        >
            <template #tableBtn="{ record }">
                <a-tooltip title="新增子级">
                    <a-button type="text" size="small" @click="openCreateChild(record as OrgItem)">
                        子级
                    </a-button>
                </a-tooltip>
            </template>
        </WcPage>
    </div>
</template>

<style lang="less" scoped>
.wc-basic-page {
    height: calc(100vh - 140px);
}
</style>
