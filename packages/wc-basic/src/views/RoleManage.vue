<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { message } from 'antdv-next'
import { WcPage } from 'wc-page'
import type { MenuItem, RoleItem } from 'wc-utils'
import {
    createRole,
    deleteRole,
    fetchMenuTree,
    fetchRoleMenuIds,
    fetchRoles,
    updateRole,
    updateRoleMenus,
} from '../api/system'
import { roleFields } from '../config/roleFields'

const menuTree = ref<MenuItem[]>([])
const menuModalVisible = ref(false)
const editingRoleId = ref<number | null>(null)
const checkedMenuIds = ref<number[]>([])

const searchApi = async () => {
    const roleList = await fetchRoles()
    return { data: roleList }
}

const addApi = async (payload: Record<string, unknown>) => {
    if (!payload.code || !payload.name) {
        throw new Error('请填写角色编码和名称')
    }
    await createRole({
        code: String(payload.code),
        name: String(payload.name),
        description: payload.description ? String(payload.description) : null,
        status: Number(payload.status ?? 1),
    })
}

const editApi = async (payload: Record<string, unknown>) => {
    await updateRole(Number(payload.id), {
        code: String(payload.code),
        name: String(payload.name),
        description: payload.description ? String(payload.description) : null,
        status: Number(payload.status ?? 1),
    })
}

const delsApi = async (ids: Array<string | number>) => {
    await Promise.all(ids.map((roleId) => deleteRole(Number(roleId))))
}

const openMenuModal = async (roleItem: RoleItem) => {
    editingRoleId.value = roleItem.id
    checkedMenuIds.value = await fetchRoleMenuIds(roleItem.id)
    menuModalVisible.value = true
}

const handleMenuSubmit = async () => {
    if (!editingRoleId.value) {
        return
    }

    try {
        await updateRoleMenus(editingRoleId.value, checkedMenuIds.value)
        message.success('菜单权限已更新')
        menuModalVisible.value = false
    } catch (error) {
        const errorResult = error as { data?: string }
        message.error(errorResult.data || '保存失败')
    }
}

onMounted(async () => {
    menuTree.value = await fetchMenuTree()
})
</script>

<template>
    <div class="wc-basic-page">
        <WcPage
            :fields="roleFields"
            :search-api="searchApi"
            :add-api="addApi"
            :edit-api="editApi"
            :dels-api="delsApi"
            title="角色"
            :table-params="{ pagination: false }"
            :form-params="{ width: '480px' }"
        >
            <template #tableBtn="{ record }">
                <a-tooltip title="分配菜单">
                    <a-button type="text" size="small" @click="openMenuModal(record as RoleItem)">
                        菜单
                    </a-button>
                </a-tooltip>
            </template>
        </WcPage>

        <a-modal v-model:open="menuModalVisible" title="分配菜单" @ok="handleMenuSubmit">
            <a-tree
                v-model:checked-keys="checkedMenuIds"
                checkable
                :tree-data="menuTree"
                :field-names="{ title: 'name', key: 'id', children: 'children' }"
            />
        </a-modal>
    </div>
</template>

<style lang="less" scoped>
.wc-basic-page {
    height: calc(100vh - 140px);
}
</style>
