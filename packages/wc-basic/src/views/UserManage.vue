<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'antdv-next'
import { WcPage } from 'wc-page'
import type { PageField } from 'wc-page'
import type { OrgItem, RoleItem, UserItem } from 'wc-utils'
import {
    createUser,
    deleteUser,
    fetchOrgTree,
    fetchRoles,
    fetchUserRoleIds,
    fetchUsers,
    updateUser,
    updateUserRoles,
} from '../api/system'
import { userFields, userSearchFields } from '../config/userFields'

const orgTree = ref<OrgItem[]>([])
const roleList = ref<RoleItem[]>([])
const roleModalVisible = ref(false)
const editingUserId = ref<number | null>(null)
const selectedRoleIds = ref<number[]>([])

const flattenOrgs = (orgItems: OrgItem[]): OrgItem[] => {
    const result: OrgItem[] = []
    const walk = (items: OrgItem[]) => {
        items.forEach((item) => {
            result.push(item)
            if (item.children?.length) {
                walk(item.children)
            }
        })
    }
    walk(orgItems)
    return result
}

const fields = computed<PageField[]>(() => {
    const nextFields = JSON.parse(JSON.stringify(userFields)) as PageField[]
    const orgField = nextFields.find((fieldItem) => fieldItem.field === 'orgId')
    const roleField = nextFields.find((fieldItem) => fieldItem.field === 'roleIds')

    if (orgField?.dataType) {
        orgField.dataType.options = flattenOrgs(orgTree.value) as unknown as Array<Record<string, unknown>>
    }
    if (roleField?.dataType) {
        roleField.dataType.options = roleList.value as unknown as Array<Record<string, unknown>>
    }

    return nextFields
})

const searchApi = async (params: Record<string, unknown>) => {
    const pageResult = await fetchUsers({
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
    if (!payload.username || !payload.password) {
        throw new Error('请填写用户名和密码')
    }
    await createUser({
        username: String(payload.username),
        password: String(payload.password),
        nickname: payload.nickname ? String(payload.nickname) : null,
        orgId: payload.orgId ? Number(payload.orgId) : null,
        phone: payload.phone ? String(payload.phone) : null,
        email: payload.email ? String(payload.email) : null,
        status: Number(payload.status ?? 1),
        roleIds: (payload.roleIds as number[]) || [],
    })
}

const editApi = async (payload: Record<string, unknown>) => {
    await updateUser(Number(payload.id), {
        nickname: payload.nickname ? String(payload.nickname) : null,
        orgId: payload.orgId ? Number(payload.orgId) : null,
        phone: payload.phone ? String(payload.phone) : null,
        email: payload.email ? String(payload.email) : null,
        status: Number(payload.status ?? 1),
        password: payload.password ? String(payload.password) : undefined,
    })
}

const delsApi = async (ids: Array<string | number>) => {
    await Promise.all(ids.map((userId) => deleteUser(Number(userId))))
}

const customEdit = async (record: Record<string, unknown>) => {
    return record
}

const openRoleModal = async (userItem: UserItem) => {
    editingUserId.value = userItem.id
    selectedRoleIds.value = await fetchUserRoleIds(userItem.id)
    roleModalVisible.value = true
}

const handleRoleSubmit = async () => {
    if (!editingUserId.value) {
        return
    }

    try {
        await updateUserRoles(editingUserId.value, selectedRoleIds.value)
        message.success('角色已更新')
        roleModalVisible.value = false
    } catch (error) {
        const errorResult = error as { data?: string }
        message.error(errorResult.data || '保存失败')
    }
}

onMounted(async () => {
    const [orgTreeData, roleListData] = await Promise.all([fetchOrgTree(), fetchRoles()])
    orgTree.value = orgTreeData
    roleList.value = roleListData
})
</script>

<template>
    <div class="wc-basic-page">
        <WcPage
            :fields="fields"
            :search-fields="userSearchFields"
            :search-api="searchApi"
            :add-api="addApi"
            :edit-api="editApi"
            :dels-api="delsApi"
            :custom-edit="customEdit"
            title="人员"
            :table-params="{ pageSizeDefault: 10 }"
            :form-params="{ width: '520px' }"
        >
            <template #tableBtn="{ record }">
                <a-tooltip title="分配角色">
                    <a-button type="text" size="small" @click="openRoleModal(record as UserItem)">
                        角色
                    </a-button>
                </a-tooltip>
            </template>
        </WcPage>

        <a-modal v-model:open="roleModalVisible" title="分配角色" @ok="handleRoleSubmit">
            <a-select
                v-model:value="selectedRoleIds"
                mode="multiple"
                style="width: 100%"
                placeholder="请选择角色"
            >
                <a-select-option v-for="roleItem in roleList" :key="roleItem.id" :value="roleItem.id">
                    {{ roleItem.name }}
                </a-select-option>
            </a-select>
        </a-modal>
    </div>
</template>

<style lang="less" scoped>
.wc-basic-page {
    height: calc(100vh - 140px);
}
</style>
