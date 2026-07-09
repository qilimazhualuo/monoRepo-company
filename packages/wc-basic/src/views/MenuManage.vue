<script setup lang="ts">
import { ref } from 'vue'
import { WcPage } from 'wc-page'
import type { MenuItem } from 'wc-utils'
import { createMenu, deleteMenu, fetchMenuTree, updateMenu } from '../api/system'
import { menuFields } from '../config/menuFields'

const pageRef = ref<InstanceType<typeof WcPage> | null>(null)
const createParentId = ref<number | null>(null)

const searchApi = async () => {
    const menuTree = await fetchMenuTree()
    return { data: menuTree }
}

const addApi = async (payload: Record<string, unknown>) => {
    if (!payload.name) {
        throw new Error('请填写菜单名称')
    }
    await createMenu({
        parentId: payload.parentId ? Number(payload.parentId) : null,
        name: String(payload.name),
        type: String(payload.type || 'menu'),
        path: payload.path ? String(payload.path) : null,
        permission: payload.permission ? String(payload.permission) : null,
        icon: null,
        sort: Number(payload.sort ?? 0),
        status: 1,
    })
}

const editApi = async (payload: Record<string, unknown>) => {
    await updateMenu(Number(payload.id), {
        parentId: payload.parentId ? Number(payload.parentId) : null,
        name: String(payload.name),
        type: String(payload.type || 'menu'),
        path: payload.path ? String(payload.path) : null,
        permission: payload.permission ? String(payload.permission) : null,
        icon: null,
        sort: Number(payload.sort ?? 0),
        status: 1,
    })
}

const delsApi = async (ids: Array<string | number>) => {
    await Promise.all(ids.map((menuId) => deleteMenu(Number(menuId))))
}

const customAdd = async () => {
    const parentId = createParentId.value
    createParentId.value = null
    return {
        parentId,
        name: '',
        type: 'menu',
        path: '',
        permission: '',
        sort: 0,
    }
}

const openCreateChild = (menuItem: MenuItem) => {
    createParentId.value = menuItem.id
    pageRef.value?.openForm()
}
</script>

<template>
    <div class="wc-basic-page">
        <WcPage
            ref="pageRef"
            :fields="menuFields"
            :search-api="searchApi"
            :add-api="addApi"
            :edit-api="editApi"
            :dels-api="delsApi"
            :custom-add="customAdd"
            title="菜单"
            :table-params="{
                pagination: false,
                defaultBtn: ['edit', 'del'],
            }"
            :form-params="{ width: '520px' }"
            :btn-group="{ add: true, del: false }"
        >
            <template #tableBtn="{ record }">
                <a-tooltip title="新增子级">
                    <a-button type="text" size="small" @click="openCreateChild(record as MenuItem)">
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
